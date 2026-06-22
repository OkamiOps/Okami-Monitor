import { timingSafeEqual } from "node:crypto";
import { config as loadEnv } from "dotenv";
import cors from "cors";
import express from "express";
import { collectHermesState, collectKanbanRaw, createKanbanTask } from "./hermesCollector.js";
import { sshExec, sshTest } from "./sshBridge.js";
import { fingerprintSecret, getConfig, saveConfig, store } from "./store.js";
import { mockMissionControl } from "../src/data/mockMissionControl.js";

loadEnv();
loadEnv({ path: ".env.local", override: false });

const app = express();
const port = Number(process.env.OKAMI_API_PORT) || 3001;
const backendProxyToken = process.env.OKAMI_BACKEND_PROXY_TOKEN || "";
const staticApiToken = process.env.OKAMI_API_TOKEN || process.env.VITE_OKAMI_API_TOKEN || "";
const allowedOrigins = parseAllowedOrigins(process.env.OKAMI_ALLOWED_ORIGINS);
const localDevTrustEnabled = process.env.NODE_ENV !== "production" && process.env.OKAMI_TRUST_LOCAL_DEV !== "0";

await store.hardenStoragePermissions();

app.disable("x-powered-by");
app.use(cors({
  origin(origin, callback) {
    callback(null, isAllowedOrigin(origin));
  },
  methods: ["GET", "PUT", "POST", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Okami-Api-Token", "X-Okami-Proxy-Token"],
  maxAge: 600,
}));
app.use(express.json({ limit: "2mb" }));
app.use(requireApiToken);

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function asyncRoute(handler) {
  return async (request, response, next) => {
    try {
      await handler(request, response);
    } catch (error) {
      next(error);
    }
  };
}

app.get("/api/health", asyncRoute(async (_request, response) => {
  response.json({
    ok: true,
    service: "okami-mission-control-api",
    authConfigured: Boolean(backendProxyToken) || Boolean(staticApiToken) || await store.hasApiKeys(),
  });
}));

app.get("/api/auth/status", asyncRoute(async (request, response) => {
  const keys = await store.listApiKeys();
  const activeKeys = keys.filter((key) => !key.revokedAt);
  const proxyAuthorized = isProxyAuthorized(request);
  const localDevTrusted = isLocalDevTrustedRequest(request);
  response.json({
    configured: localDevTrusted || Boolean(backendProxyToken) || Boolean(staticApiToken) || activeKeys.length > 0,
    proxyConfigured: Boolean(backendProxyToken),
    localDevTrusted,
    staticTokenConfigured: Boolean(staticApiToken),
    keyCount: activeKeys.length,
    bootstrapAvailable: activeKeys.length === 0 && (localDevTrusted || proxyAuthorized),
  });
}));

app.post("/api/auth/bootstrap", asyncRoute(async (request, response) => {
  if (!isLoopbackRequest(request) && !isProxyAuthorized(request)) {
    response.status(403).json({ error: "Bootstrap permitido apenas via loopback local ou proxy interno autorizado." });
    return;
  }
  if (await store.hasApiKeys()) {
    response.status(409).json({ error: "API key inicial ja existe. Use uma key admin para criar outras." });
    return;
  }

  const result = await store.createApiKey({
    name: request.body?.name || "Admin local",
    scopes: ["admin", "read", "write", "ssh", "kanban", "logs"],
    createdBy: "bootstrap",
  });
  response.status(201).json(result);
}));

app.get("/api/auth/keys", requireScope("admin"), asyncRoute(async (_request, response) => {
  response.json({ keys: await store.listApiKeys() });
}));

app.post("/api/auth/keys", requireScope("admin"), asyncRoute(async (request, response) => {
  const result = await store.createApiKey({
    name: request.body?.name,
    scopes: request.body?.scopes,
    createdBy: request.auth?.key?.name || "admin",
  });
  response.status(201).json(result);
}));

app.delete("/api/auth/keys/:id", requireScope("admin"), asyncRoute(async (request, response) => {
  const revoked = await store.revokeApiKey(request.params.id);
  if (!revoked) {
    response.status(404).json({ error: "API key nao encontrada." });
    return;
  }
  response.json({ revoked });
}));

app.get("/api/mission-control/state", requireScope("read"), asyncRoute(async (_request, response) => {
  response.json(await collectHermesState(await getConfig(), store));
}));

// SSE stream: conexão ao vivo persistente. Envia o state inicial e em seguida
// só os deltas/heartbeats — sem refresh agressivo no cliente.
app.get("/api/mission-control/stream", requireScope("read"), async (request, response) => {
  response.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  response.flushHeaders?.();

  let closed = false;
  request.on("close", () => { closed = true; });

  const send = (event, data) => {
    if (closed) return;
    response.write(`event: ${event}\n`);
    response.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Push inicial
  try {
    const initial = await collectHermesState(await getConfig(), store);
    send("state", initial);
  } catch (err) {
    send("error", { message: String(err?.message ?? err) });
  }

  // Push periódico — intervalo maior porque a conexão fica aberta (não derruba).
  const intervalMs = Number(process.env.OKAMI_STREAM_INTERVAL_MS) || 8000;
  const heartbeatMs = 25000;
  let lastHash = "";

  const tick = async () => {
    if (closed) return;
    try {
      const state = await collectHermesState(await getConfig(), store);
      const hash = JSON.stringify(state).length + ":" + (state?.lastUpdated ?? "");
      if (hash !== lastHash) {
        lastHash = hash;
        send("state", state);
      } else {
        send("heartbeat", { t: Date.now() });
      }
    } catch (err) {
      send("error", { message: String(err?.message ?? err) });
    }
  };

  const interval = setInterval(tick, intervalMs);
  const heartbeat = setInterval(() => {
    if (!closed) response.write(`: ping\n\n`);
  }, heartbeatMs);

  request.on("close", () => {
    clearInterval(interval);
    clearInterval(heartbeat);
  });
});

app.get("/api/mission-control/apps", requireScope("read"), asyncRoute(async (_request, response) => {
  response.json(await store.getRegistry("apps", mockMissionControl.apps));
}));

app.put("/api/mission-control/apps/:id", requireScope("write"), asyncRoute(async (request, response) => {
  response.json(await store.upsertRegistryItem("apps", { ...request.body, id: request.params.id }, mockMissionControl.apps));
}));

app.delete("/api/mission-control/apps/:id", requireScope("write"), asyncRoute(async (request, response) => {
  response.json(await store.deleteRegistryItem("apps", request.params.id, mockMissionControl.apps));
}));

app.get("/api/mission-control/docs", requireScope("read"), asyncRoute(async (_request, response) => {
  response.json(await store.getRegistry("docs", mockMissionControl.docs));
}));

app.put("/api/mission-control/docs/:id", requireScope("write"), asyncRoute(async (request, response) => {
  response.json(await store.upsertRegistryItem("docs", { ...request.body, id: request.params.id }, mockMissionControl.docs));
}));

app.delete("/api/mission-control/docs/:id", requireScope("write"), asyncRoute(async (request, response) => {
  response.json(await store.deleteRegistryItem("docs", request.params.id, mockMissionControl.docs));
}));

app.get("/api/mission-control/agent-runtimes", requireScope("read"), asyncRoute(async (_request, response) => {
  response.json(await store.getRegistry("agentRuntimes", []));
}));

app.put("/api/mission-control/agent-runtimes/:id", requireScope("write"), asyncRoute(async (request, response) => {
  const runtime = normalizeAgentRuntime({ ...request.body, id: request.params.id });
  response.json(await store.upsertRegistryItem("agentRuntimes", runtime, []));
}));

app.post("/api/mission-control/agent-runtimes/:id/connect", requireScope("admin"), asyncRoute(async (request, response) => {
  const runtime = normalizeAgentRuntime({ ...(request.body?.runtime ?? request.body ?? {}), id: request.params.id });
  const scopes = normalizeScopes(runtime.recommendedScopes, ["read"]);
  const apiKeyResult = await store.createApiKey({
    name: runtime.suggestedKeyName || `${runtime.id}-agent`,
    scopes,
    createdBy: request.auth?.key?.name || "agent-connect",
  });
  const savedSecret = await store.saveSecret(apiKeyResult.token, "agent-api-key");
  const config = await getConfig();
  const apiBaseUrl = normalizeAgentApiBaseUrl(request.body?.apiBaseUrl)
    || normalizeAgentApiBaseUrl(process.env.OKAMI_PUBLIC_API_BASE_URL)
    || normalizeAgentApiBaseUrl(process.env.OKAMI_BACKEND_URL)
    || normalizeAgentApiBaseUrl(`${request.protocol}://${request.get("host")}`);
  const envPath = runtimeAgentEnvPath(runtime);
  const injection = await writeAgentAccessEnv({
    config,
    runtime,
    token: apiKeyResult.token,
    apiBaseUrl,
    envPath,
  });
  const connectedRuntime = normalizeAgentRuntime({
    ...runtime,
    status: injection.saved ? "connected" : "key-ready",
    apiKey: {
      keyId: apiKeyResult.key.id,
      tokenPrefix: apiKeyResult.key.tokenPrefix,
      scopes: apiKeyResult.key.scopes,
      secretRef: savedSecret.ref,
      fingerprint: savedSecret.fingerprint,
      apiBaseUrl,
      envPath,
      connectedAt: new Date().toISOString(),
      injectedAt: injection.saved ? new Date().toISOString() : null,
      injectionStatus: injection.saved ? "env-written" : "vault-only",
    },
  });
  await store.upsertRegistryItem("agentRuntimes", connectedRuntime, []);
  response.status(201).json({
    runtime: connectedRuntime,
    apiKey: connectedRuntime.apiKey,
    injection,
  });
}));

app.delete("/api/mission-control/agent-runtimes/:id", requireScope("write"), asyncRoute(async (request, response) => {
  response.json(await store.deleteRegistryItem("agentRuntimes", request.params.id, []));
}));

app.put("/api/mission-control/apis/:id", requireScope("write"), asyncRoute(async (request, response) => {
  response.json(await store.upsertRegistryItem("apis", { ...request.body, id: request.params.id }, mockMissionControl.apiKeys));
}));

app.delete("/api/mission-control/apis/:id", requireScope("write"), asyncRoute(async (request, response) => {
  response.json(await store.deleteRegistryItem("apis", request.params.id, mockMissionControl.apiKeys));
}));

app.post("/api/mission-control/apis/:id/test", requireScope("write"), asyncRoute(async (request, response) => {
  const api = request.body;
  response.json({
    healthy: false,
    verified: false,
    latency: api.status === "disabled" ? 0 : api.latency || 0,
    message: "Teste real de provider ainda nao implementado no backend. Registro salvo, mas credencial nao foi validada.",
  });
}));

app.post("/api/mission-control/apis/:id/rotate", requireScope("write"), asyncRoute(async (_request, response) => {
  response.status(501).json({
    rotated: false,
    error: "Rotacao real de secrets ainda nao implementada no backend.",
  });
}));

app.get("/api/hermes/config", requireScope("read"), asyncRoute(async (_request, response) => {
  response.json(await getConfig());
}));

app.put("/api/hermes/config", requireScope("ssh"), asyncRoute(async (request, response) => {
  response.json(await saveConfig(normalizeConfig({ ...(await getConfig()), ...request.body })));
}));

app.post("/api/hermes/ssh/keys", requireScope("ssh"), asyncRoute(async (request, response) => {
  const { name = "hermes-key", privateKey, passphrase = "" } = request.body;
  if (!privateKey || privateKey.includes("ssh-") && !privateKey.includes("PRIVATE KEY")) {
    response.status(400).json({ error: "Envie a private key, nao a chave publica .pub." });
    return;
  }

  const saved = await store.saveSecret(privateKey, "ssh-key");
  if (passphrase) {
    await store.setSecret(`${saved.ref}:passphrase`, passphrase);
  }
  const config = await saveConfig({
    ...(await getConfig()),
    sshAuthMethod: "key",
    sshKeyPath: saved.ref,
    sshKeyFingerprint: saved.fingerprint,
    sshKeyStorage: "server/.data/secrets.json",
  });

  response.json({
    keyId: saved.ref.replace("vault://ssh-key/", ""),
    keyRef: saved.ref,
    name,
    fingerprint: saved.fingerprint,
    storage: config.sshKeyStorage,
  });
}));

app.post("/api/hermes/ssh/password", requireScope("ssh"), asyncRoute(async (request, response) => {
  const { host, user, port: sshPort, password } = request.body;
  if (!password) {
    response.status(400).json({ error: "Senha obrigatoria." });
    return;
  }

  const saved = await store.saveSecret(password, "ssh-password");
  await saveConfig({
    ...(await getConfig()),
    sshHost: host,
    sshUser: user,
    sshPort,
    sshAuthMethod: "password",
    sshPasswordRef: saved.ref,
    sshKeyStorage: "server/.data/secrets.json",
  });
  response.json({
    passwordRef: saved.ref,
    fingerprint: fingerprintSecret(password),
    storage: "server/.data/secrets.json",
  });
}));

app.post("/api/hermes/ssh/test", requireScope("ssh"), asyncRoute(async (request, response) => {
  const config = normalizeConfig({ ...(await getConfig()), ...request.body });
  if (request.body.sshPassword) {
    const saved = await store.saveSecret(request.body.sshPassword, "ssh-password");
    config.sshPasswordRef = saved.ref;
    config.sshAuthMethod = "password";
    await saveConfig(config);
  }

  const started = Date.now();
  let result;
  try {
    result = await sshTest(config, store);
  } catch (error) {
    result = {
      ok: false,
      stdout: "",
      stderr: String(error?.message ?? error),
    };
  }
  response.json({
    ...result,
    latency: Date.now() - started,
    source: "ssh",
    message: result.ok ? "SSH validado na VPS real." : (result.stderr || "SSH falhou."),
  });
}));

app.get("/api/hermes/status", requireScope("ssh"), asyncRoute(async (_request, response) => {
  const config = await getConfig();
  const home = config.hermesHome || "~/.hermes";
  const command = `python3 - <<'PY'
import getpass, os, shutil, socket
home = os.path.realpath(os.path.expanduser(${JSON.stringify(home)}))
print(socket.gethostname())
print(getpass.getuser())
print(shutil.which('hermes') or '')
if os.path.isdir(home):
    print('hermes_home_ok')
PY`;
  const result = await sshExec(config, store, command);
  response.json({ ok: result.exitCode === 0, stdout: result.stdout, stderr: result.stderr });
}));

app.get("/api/hermes/logs", requireScope("logs"), asyncRoute(async (_request, response) => {
  const config = await getConfig();
  const home = config.hermesHome || "~/.hermes";
  const command = `python3 - <<'PY'
import glob, os, subprocess
home = os.path.realpath(os.path.expanduser(${JSON.stringify(home)}))
logs = os.path.join(home, 'logs')
if os.path.isdir(logs):
    files = [path for path in sorted(glob.glob(os.path.join(logs, '*'))) if os.path.isfile(path)][:8]
    if files:
        subprocess.run(['tail', '-n', '80', *files], check=False)
PY`;
  const result = await sshExec(config, store, command);
  response.json({ logs: result.stdout, error: result.stderr });
}));

app.get("/api/hermes/kanban/tasks", requireScope("read"), asyncRoute(async (_request, response) => {
  const config = await getConfig();
  response.type("json").send(await collectKanbanRaw(config, store) || "[]");
}));

app.post("/api/hermes/kanban/tasks", requireScope("kanban"), asyncRoute(async (request, response) => {
  response.json(await createKanbanTask(await getConfig(), store, request.body));
}));

app.post("/api/hermes/command", requireScope("ssh"), asyncRoute(async (request, response) => {
  const config = await getConfig();
  const runtimeRegistry = await getKnownAgentRuntimes(config);
  const allowed = new Set([
    "hermes doctor",
    "hermes config",
    "hermes status",
    "hermes insights",
    "hermes sessions list --limit 20",
    "hermes sessions stats",
    "openclaw doctor",
    "openclaw gateway status",
    "openclaw --version",
    "openhuman --version",
    "claude --version",
    "codex --version",
    ...runtimeRegistry.flatMap((runtime) => safeRuntimeCommands(runtime)),
  ]);
  const command = request.body.command;
  if (!allowed.has(command)) {
    response.status(403).json({ error: "Command not allowed." });
    return;
  }
  const result = await sshExec(config, store, command);
  response.json({ exitCode: result.exitCode, output: `${result.stdout}${result.stderr ? `\n${result.stderr}` : ""}` });
}));

app.post("/api/hermes/files/write", requireScope("ssh"), asyncRoute(async (request, response) => {
  const { path: filePath, content = "" } = request.body;
  const config = await getConfig();
  const hermesHome = config.hermesHome || "~/.hermes";
  const runtimeRegistry = await store.getRegistry("agentRuntimes", []);
  const allowedRoots = agentRuntimeRoots([
    { home: hermesHome },
    { home: "~/.codex" },
    { home: "~/.openclaw" },
    { home: "~/.openhuman" },
    { home: "~/.claude" },
    { home: "~/.agents" },
    ...runtimeRegistry,
  ]);
  if (!isAllowedAgentFilePath(filePath, allowedRoots)) {
    response.status(400).json({ error: "Arquivo fora do escopo de agentes permitido." });
    return;
  }

  if (!config.sshHost || !config.sshUser) {
    const savedInRegistry = await updateAgentRegistryFile(filePath, content);
    if (savedInRegistry) {
      response.json({
        saved: true,
        path: filePath,
        storage: "registry",
        message: "Arquivo salvo no registro do painel. Configure o SSH dos agentes para aplicar no servidor remoto.",
      });
      return;
    }

    response.status(400).json({ error: "Configure o SSH dos agentes antes de salvar arquivos remotos." });
    return;
  }

  const payload = Buffer.from(String(content), "utf8").toString("base64");
  const command = `python3 - <<'PY'
import base64, os
target = os.path.realpath(os.path.expanduser(${JSON.stringify(filePath)}))
allowed = [
    *[os.path.realpath(os.path.expanduser(item)) for item in ${JSON.stringify(allowedRoots)}],
]
if not any(target == base or target.startswith(base + os.sep) for base in allowed):
    raise SystemExit('blocked path')
os.makedirs(os.path.dirname(target), exist_ok=True)
with open(target, 'w') as handle:
    handle.write(base64.b64decode(${JSON.stringify(payload)}).decode('utf-8'))
print(target)
PY`;
  const result = await sshExec(config, store, command, { timeoutMs: 12000 });
  if (result.exitCode === 0) await updateAgentRegistryFile(filePath, content);
  response.json({ saved: result.exitCode === 0, path: result.stdout.trim(), error: result.stderr.trim() });
}));

app.post("/api/hermes/cron/save", requireScope("ssh"), asyncRoute(async (request, response) => {
  const { original = "", line = "" } = request.body;
  if (!line.trim()) {
    response.status(400).json({ error: "Linha de cron obrigatoria." });
    return;
  }
  if (/[\r\n]/.test(String(line))) {
    response.status(400).json({ error: "Linha de cron nao pode conter quebras de linha." });
    return;
  }

  const payload = Buffer.from(String(line).trim(), "utf8").toString("base64");
  const originalPayload = Buffer.from(String(original).trim(), "utf8").toString("base64");
  const command = `python3 - <<'PY'
import base64, subprocess, tempfile, os
line = base64.b64decode(${JSON.stringify(payload)}).decode('utf-8').strip()
original = base64.b64decode(${JSON.stringify(originalPayload)}).decode('utf-8').strip()
current = subprocess.run(['crontab', '-l'], capture_output=True, text=True)
lines = [] if current.returncode else [item.rstrip('\\n') for item in current.stdout.splitlines()]
if original:
    replaced = False
    next_lines = []
    for item in lines:
        if item.strip() == original:
            next_lines.append(line)
            replaced = True
        else:
            next_lines.append(item)
    lines = next_lines
    if not replaced:
        lines.append(line)
elif line not in [item.strip() for item in lines]:
    lines.append(line)
fd, path = tempfile.mkstemp(prefix='okami-cron-', text=True)
with os.fdopen(fd, 'w') as handle:
    handle.write('\\n'.join(lines).rstrip() + '\\n')
result = subprocess.run(['crontab', path], capture_output=True, text=True)
os.unlink(path)
print('saved' if result.returncode == 0 else result.stderr)
raise SystemExit(result.returncode)
PY`;
  const result = await sshExec(await getConfig(), store, command, { timeoutMs: 12000 });
  response.json({ saved: result.exitCode === 0, output: `${result.stdout}${result.stderr ? `\n${result.stderr}` : ""}`.trim() });
}));

app.post("/api/hermes/systemd-timer/save", requireScope("ssh"), asyncRoute(async (request, response) => {
  const { unit = "", onCalendar = "" } = request.body;
  if (!/^[A-Za-z0-9_.@-]+\.timer$/.test(unit)) {
    response.status(400).json({ error: "Timer systemd invalido." });
    return;
  }
  if (!String(onCalendar).trim()) {
    response.status(400).json({ error: "OnCalendar obrigatorio." });
    return;
  }
  if (/[\r\n]/.test(String(onCalendar))) {
    response.status(400).json({ error: "OnCalendar nao pode conter quebras de linha." });
    return;
  }

  const payload = Buffer.from(String(onCalendar).trim(), "utf8").toString("base64");
  const command = `python3 - <<'PY'
import base64, os, subprocess
unit = ${JSON.stringify(unit)}
calendar = base64.b64decode(${JSON.stringify(payload)}).decode('utf-8').strip()
dropin_dir = f'/etc/systemd/system/{unit}.d'
os.makedirs(dropin_dir, exist_ok=True)
path = os.path.join(dropin_dir, 'okami-mission-control.conf')
with open(path, 'w') as handle:
    handle.write('[Timer]\\nOnCalendar=\\nOnCalendar=' + calendar + '\\nPersistent=true\\n')
for args in (['systemctl', 'daemon-reload'], ['systemctl', 'restart', unit]):
    result = subprocess.run(args, capture_output=True, text=True)
    if result.returncode != 0:
        print(result.stderr or result.stdout)
        raise SystemExit(result.returncode)
print(path)
PY`;
  const result = await sshExec(await getConfig(), store, command, { timeoutMs: 15000 });
  response.json({ saved: result.exitCode === 0, output: `${result.stdout}${result.stderr ? `\n${result.stderr}` : ""}`.trim() });
}));

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(error.statusCode || 500).json({ error: error.message });
});

function normalizeConfig(config) {
  const next = {
    ...config,
    sshHost: cleanOptionalToken(config.sshHost, "sshHost", /^[A-Za-z0-9._:-]{0,253}$/),
    sshUser: cleanOptionalToken(config.sshUser, "sshUser", /^[A-Za-z0-9._-]{0,80}$/),
    sshPort: normalizePort(config.sshPort),
    sshAuthMethod: normalizeChoice(config.sshAuthMethod, "sshAuthMethod", ["key", "password"], "key"),
    terminalBackend: normalizeChoice(config.terminalBackend, "terminalBackend", ["ssh", "local", "docker", "modal", "daytona", "vercel_sandbox", "singularity"], "ssh"),
    hermesHome: normalizeRemotePath(config.hermesHome || "~/.hermes", "hermesHome"),
  };

  if (next.sshKeyPath?.startsWith("vault://ssh/ssh-key_")) {
    next.sshKeyPath = next.sshKeyPath.replace("vault://ssh/", "vault://ssh-key/");
  }

  if (next.sshKeyPath && !next.sshKeyPath.startsWith("vault://")) {
    next.sshKeyPath = normalizeRemotePath(next.sshKeyPath, "sshKeyPath");
  }
  return next;
}

function parseAllowedOrigins(raw = "") {
  return new Set(raw.split(",").map((origin) => origin.trim()).filter(Boolean));
}

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (!allowedOrigins.size) return true;
  if (allowedOrigins.has(origin)) return true;
  try {
    const url = new URL(origin);
    return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname)
      && ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

async function requireApiToken(request, response, next) {
  if (request.path === "/api/health" || request.path === "/api/auth/status" || request.path === "/api/auth/bootstrap") {
    next();
    return;
  }

  if (isProxyAuthorized(request)) {
    request.auth = {
      type: "backend-proxy",
      key: { id: "proxy", name: "Backend proxy", scopes: ["admin", "read", "write", "ssh", "kanban", "logs"] },
    };
    next();
    return;
  }

  if (isLocalDevTrustedRequest(request)) {
    request.auth = {
      type: "local-dev",
      key: { id: "local-dev", name: "Local dev", scopes: ["admin", "read", "write", "ssh", "kanban", "logs"] },
    };
    next();
    return;
  }

  const hasStoredKeys = await store.hasApiKeys();
  if (!staticApiToken && !hasStoredKeys) {
    response.status(503).json({ error: "Nenhuma Okami API Key configurada. Use a aba Agentes para preparar o acesso inicial." });
    return;
  }

  const header = request.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : request.get("x-okami-api-token") || "";

  if (staticApiToken && safeEqual(token, staticApiToken)) {
    request.auth = {
      type: "static",
      key: { id: "env", name: "Env token", scopes: ["admin", "read", "write", "ssh", "kanban", "logs"] },
    };
    next();
    return;
  }

  const apiKey = await store.validateApiKey(token);
  if (!apiKey) {
    response.status(401).json({ error: "Token de API invalido ou ausente." });
    return;
  }

  request.auth = { type: "api-key", key: apiKey };
  next();
}

function isProxyAuthorized(request) {
  const proxyToken = request.get("x-okami-proxy-token") || "";
  return Boolean(backendProxyToken) && safeEqual(proxyToken, backendProxyToken);
}

function isLocalDevTrustedRequest(request) {
  return localDevTrustEnabled && isLoopbackRequest(request);
}

function requireScope(...scopes) {
  return (request, response, next) => {
    if (hasScope(request.auth?.key, scopes)) {
      next();
      return;
    }
    response.status(403).json({ error: `Escopo insuficiente. Necessario: ${scopes.join(" ou ")}.` });
  };
}

function hasScope(key, scopes) {
  const granted = new Set(key?.scopes ?? []);
  return granted.has("admin") || scopes.some((scope) => granted.has(scope));
}

function normalizeRuntimeId(value) {
  const id = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  if (!id) throw new HttpError(400, "runtime id invalido.");
  return id;
}

function normalizeRuntimeCommand(command, field = "command") {
  const text = String(command || "").trim();
  if (!text || text.length > 160 || /[\0\r\n;&|`$<>]/.test(text)) {
    throw new HttpError(400, `${field} invalido.`);
  }
  const parts = text.split(/\s+/);
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(parts[0])) {
    throw new HttpError(400, `${field} precisa iniciar com executavel simples.`);
  }
  if (!parts.every((part) => /^[A-Za-z0-9._:/=@+-]{1,96}$/.test(part))) {
    throw new HttpError(400, `${field} contem argumento invalido.`);
  }
  return text;
}

function normalizeScopes(scopes, fallback = ["read"]) {
  const allowed = new Set(["admin", "read", "write", "ssh", "kanban", "logs"]);
  const list = (Array.isArray(scopes) ? scopes : String(scopes || "").split(","))
    .map((scope) => String(scope).trim())
    .filter((scope) => allowed.has(scope));
  return [...new Set(list.length ? list : fallback)];
}

function normalizeOptionalRemotePath(value, field, fallback) {
  return normalizeRemotePath(value || fallback, field);
}

function normalizeTextList(value, fallback = []) {
  const list = Array.isArray(value) ? value : String(value || "").split(",");
  const normalized = list.map((item) => String(item).trim().slice(0, 140)).filter(Boolean);
  return normalized.length ? normalized.slice(0, 20) : fallback;
}

function normalizeAgentApiBaseUrl(value = "") {
  const text = String(value || "").trim();
  if (!text) return "";
  try {
    const url = new URL(text);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function runtimeAgentEnvPath(runtime) {
  const base = String(runtime.workspacePath || runtime.home || `~/.agents/workspaces/${runtime.id}`).replace(/\/$/, "");
  return normalizeRemotePath(`${base}/.okami.env`, "agentEnvPath");
}

function normalizeRuntimeApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== "object") return undefined;
  let envPath;
  try {
    envPath = apiKey.envPath ? normalizeRemotePath(apiKey.envPath, "apiKey.envPath") : undefined;
  } catch {
    envPath = undefined;
  }

  return {
    keyId: String(apiKey.keyId || "").slice(0, 120),
    tokenPrefix: String(apiKey.tokenPrefix || "").slice(0, 80),
    scopes: normalizeScopes(apiKey.scopes, ["read"]),
    secretRef: String(apiKey.secretRef || "").slice(0, 240),
    fingerprint: String(apiKey.fingerprint || "").slice(0, 120),
    apiBaseUrl: normalizeAgentApiBaseUrl(apiKey.apiBaseUrl),
    envPath,
    connectedAt: apiKey.connectedAt ? String(apiKey.connectedAt).slice(0, 80) : undefined,
    injectedAt: apiKey.injectedAt ? String(apiKey.injectedAt).slice(0, 80) : null,
    injectionStatus: String(apiKey.injectionStatus || "vault-only").slice(0, 80),
  };
}

function normalizeRuntimeCommands(commands, fallbackCommand) {
  const source = Array.isArray(commands) && commands.length ? commands : [{ label: "Health", command: fallbackCommand }];
  return source.slice(0, 12).map((item, index) => ({
    label: String(item.label || `Command ${index + 1}`).slice(0, 80),
    command: normalizeRuntimeCommand(item.command || fallbackCommand, "commands.command"),
  }));
}

function normalizeAgentRuntime(runtime) {
  const id = normalizeRuntimeId(runtime.id || runtime.name || runtime.command);
  const command = normalizeRuntimeCommand(runtime.command || `${id} status`);
  const home = normalizeOptionalRemotePath(runtime.home || runtime.root, "home", `~/.agents/workspaces/${id}`);
  const workspacePath = normalizeOptionalRemotePath(runtime.workspacePath || runtime.workspace, "workspacePath", home);
  const configPath = normalizeOptionalRemotePath(runtime.configPath || runtime.config, "configPath", "~/.agents/registry.json");
  const configs = Array.isArray(runtime.configs) && runtime.configs.length
    ? runtime.configs
    : [{
      name: configPath.split("/").pop() || "registry.json",
      path: configPath,
      profile: "global",
      type: configPath.split(".").pop() || "json",
      content: "",
    }];

  return {
    id,
    name: String(runtime.name || id).slice(0, 120),
    family: String(runtime.family || "custom").slice(0, 80),
    status: String(runtime.status || "registered").slice(0, 80),
    command,
    home,
    configPath,
    workspacePath,
    dashboardUrl: String(runtime.dashboardUrl || runtime.url || "custom").slice(0, 240),
    docsUrl: runtime.docsUrl ? String(runtime.docsUrl).slice(0, 240) : undefined,
    repoUrl: runtime.repoUrl ? String(runtime.repoUrl).slice(0, 240) : undefined,
    summary: String(runtime.summary || "Runtime externo registrado no Okami Mission Control.").slice(0, 500),
    recommendedScopes: normalizeScopes(runtime.recommendedScopes || runtime.scopes, ["read"]),
    suggestedKeyName: String(runtime.suggestedKeyName || `${id}-agent`).slice(0, 80),
    capabilities: normalizeTextList(runtime.capabilities, ["health command", "workspace", "config registrada"]),
    setup: normalizeTextList(runtime.setup, ["Instalar runtime no host", "Validar comando de health", "Conectar pelo painel"]),
    commands: normalizeRuntimeCommands(runtime.commands, command),
    configs: configs.slice(0, 12).map((config) => ({
      name: String(config.name || String(config.path || configPath).split("/").pop() || "config").slice(0, 120),
      path: normalizeRemotePath(config.path || configPath, "config.path"),
      runtime: id,
      profile: String(config.profile || "global").slice(0, 80),
      type: String(config.type || "text").slice(0, 30),
      content: String(config.content || "").slice(0, 20000),
      readonly: Boolean(config.readonly),
      redacted: Boolean(config.redacted),
    })),
    instances: Array.isArray(runtime.instances) ? runtime.instances.slice(0, 20) : [],
    apiKey: normalizeRuntimeApiKey(runtime.apiKey),
    source: "backend-registry",
  };
}

async function writeAgentAccessEnv({ config, runtime, token, apiBaseUrl, envPath }) {
  const idle = {
    attempted: false,
    saved: false,
    path: envPath,
    message: "SSH dos agentes ainda nao configurado. A key ficou guardada no cofre do painel e sera aplicada quando o SSH for salvo.",
  };

  if (!config.sshHost || !config.sshUser) return idle;

  const registry = await store.getRegistry("agentRuntimes", []);
  const allowedRoots = agentRuntimeRoots([
    { home: config.hermesHome || "~/.hermes" },
    { home: "~/.agents" },
    runtime,
    ...registry,
  ]);

  if (!isAllowedAgentFilePath(envPath, allowedRoots)) {
    return {
      ...idle,
      attempted: false,
      message: "Workspace do agente fora do escopo permitido para escrita automatica.",
    };
  }

  const envBody = [
    "# Gerado pelo Okami Monitor. Nao cole keys manualmente neste arquivo.",
    `OKAMI_AGENT_ID=${runtime.id}`,
    `OKAMI_AGENT_NAME=${runtime.name}`,
    `OKAMI_API_BASE_URL=${apiBaseUrl}`,
    `OKAMI_API_KEY=${token}`,
    "",
  ].join("\n");
  const payload = Buffer.from(envBody, "utf8").toString("base64");
  const command = `python3 - <<'PY'
import base64, os, stat
target = os.path.realpath(os.path.expanduser(${JSON.stringify(envPath)}))
allowed = [os.path.realpath(os.path.expanduser(item)) for item in ${JSON.stringify(allowedRoots)}]
if not any(target == base or target.startswith(base + os.sep) for base in allowed):
    raise SystemExit('blocked path')
os.makedirs(os.path.dirname(target), exist_ok=True)
with open(target, 'w') as handle:
    handle.write(base64.b64decode(${JSON.stringify(payload)}).decode('utf-8'))
os.chmod(target, stat.S_IRUSR | stat.S_IWUSR)
print(target)
PY`;

  try {
    const result = await sshExec(config, store, command, { timeoutMs: 12000 });
    const output = result.stdout.trim();
    return {
      attempted: true,
      saved: result.exitCode === 0,
      path: output || envPath,
      message: result.exitCode === 0
        ? "Arquivo .okami.env preparado no workspace do agente."
        : result.stderr.trim() || "SSH retornou erro ao preparar o agente.",
    };
  } catch (error) {
    return {
      attempted: true,
      saved: false,
      path: envPath,
      message: `Nao consegui preparar o agente via SSH: ${error.message}`,
    };
  }
}

function runtimeExecutable(command = "") {
  return String(command).trim().split(/\s+/)[0] || "";
}

function isSafeDiagnosticCommand(command, runtimeCommand) {
  let text;
  try {
    text = normalizeRuntimeCommand(command);
  } catch {
    return false;
  }
  const runtimeExec = runtimeExecutable(runtimeCommand);
  const parts = text.split(/\s+/);
  if (!runtimeExec || parts[0] !== runtimeExec || parts.length < 2) return false;
  const verb = parts[1];
  const rest = parts.slice(2);
  const simpleVerbs = new Set(["--version", "version", "status", "doctor", "health"]);
  if (simpleVerbs.has(verb)) {
    return rest.every((part) => /^--?[A-Za-z0-9][A-Za-z0-9._-]*(=[A-Za-z0-9._:/@+-]+)?$/.test(part));
  }
  if (verb === "gateway" && rest[0] === "status") {
    return rest.slice(1).every((part) => /^--?[A-Za-z0-9][A-Za-z0-9._-]*(=[A-Za-z0-9._:/@+-]+)?$/.test(part));
  }
  return false;
}

function safeRuntimeCommands(runtime) {
  const runtimeCommand = runtime.command || "";
  const executable = runtimeExecutable(runtimeCommand);
  const candidates = [
    runtimeCommand,
    `${executable} --version`,
    `${executable} status`,
    `${executable} doctor`,
    `${executable} health`,
    ...(Array.isArray(runtime.commands) ? runtime.commands.map((item) => item.command) : []),
  ];
  return [...new Set(candidates.filter((command) => isSafeDiagnosticCommand(command, runtimeCommand)))];
}

async function getKnownAgentRuntimes(config) {
  const local = await store.getRegistry("agentRuntimes", []);
  const remote = await readRemoteAgentRegistry(config);
  return [...local, ...remote].map((runtime) => {
    try {
      return normalizeAgentRuntime(runtime);
    } catch {
      return null;
    }
  }).filter(Boolean);
}

async function readRemoteAgentRegistry(config) {
  if (!config.sshHost || !config.sshUser) return [];
  const command = `python3 - <<'PY'
import json, os
path = os.path.expanduser('~/.agents/registry.json')
if not os.path.isfile(path):
    print('[]')
    raise SystemExit
try:
    with open(path, 'r', errors='replace') as handle:
        data = json.load(handle)
    print(json.dumps(data.get('runtimes', data if isinstance(data, list) else [])))
except Exception:
    print('[]')
PY`;
  try {
    const result = await sshExec(config, store, command, { timeoutMs: 6000 });
    const parsed = JSON.parse(result.stdout || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function updateAgentRegistryFile(filePath, content) {
  let normalizedPath;
  try {
    normalizedPath = normalizeRemotePath(filePath, "path");
  } catch {
    return false;
  }

  const registry = await store.getRegistry("agentRuntimes", []);
  let changed = false;
  const nextRegistry = registry.map((runtime) => {
    if (!Array.isArray(runtime.configs)) return runtime;
    let runtimeChanged = false;
    const nextConfigs = runtime.configs.map((file) => {
      if (file.path !== normalizedPath) return file;
      changed = true;
      runtimeChanged = true;
      return {
        ...file,
        content: String(content).slice(0, 20000),
        updatedAt: new Date().toISOString(),
      };
    });
    return runtimeChanged ? { ...runtime, configs: nextConfigs } : runtime;
  });

  if (changed) await store.saveRegistry("agentRuntimes", nextRegistry);
  return changed;
}

function parentRemotePath(value) {
  const text = String(value || "");
  if (!text || text === "~" || text.endsWith("/")) return text.replace(/\/$/, "");
  const index = text.lastIndexOf("/");
  if (index <= 0) return "";
  if (text.startsWith("~/") && index === 1) return "~";
  return text.slice(0, index);
}

function agentRuntimeRoots(runtimes) {
  const roots = [];
  runtimes.forEach((runtime) => {
    [runtime.home, runtime.workspacePath || runtime.workspace, parentRemotePath(runtime.configPath || runtime.config)].forEach((value) => {
      if (!value) return;
      try {
        roots.push(normalizeRemotePath(value, "runtimeRoot").replace(/\/$/, ""));
      } catch {}
    });
  });
  return [...new Set(roots)];
}

function isAllowedAgentFilePath(filePath, allowedRoots) {
  let target;
  try {
    target = normalizeRemotePath(filePath, "path").replace(/\/$/, "");
  } catch {
    return false;
  }
  return allowedRoots.some((root) => target === root || target.startsWith(`${root}/`));
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function isLoopbackRequest(request) {
  const ip = request.ip || request.socket?.remoteAddress || "";
  return ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(ip) || ip.startsWith("::ffff:127.");
}

function cleanOptionalToken(value, field, pattern) {
  const text = String(value ?? "").trim();
  if (!pattern.test(text)) {
    throw new HttpError(400, `${field} invalido.`);
  }
  return text;
}

function normalizePort(value) {
  const portNumber = Number(value) || 22;
  if (!Number.isInteger(portNumber) || portNumber < 1 || portNumber > 65535) {
    throw new HttpError(400, "sshPort invalido.");
  }
  return portNumber;
}

function normalizeChoice(value, field, choices, fallback) {
  const text = String(value || fallback);
  if (!choices.includes(text)) {
    throw new HttpError(400, `${field} invalido.`);
  }
  return text;
}

function normalizeRemotePath(value, field) {
  const text = String(value ?? "").trim();
  if (!text || text.length > 260 || /[\0\r\n;&|`$<>]/.test(text)) {
    throw new HttpError(400, `${field} invalido.`);
  }
  if (!(text === "~" || text.startsWith("~/") || text.startsWith("/"))) {
    throw new HttpError(400, `${field} deve ser absoluto ou iniciar com ~/`);
  }
  return text;
}

const server = app.listen(port, "127.0.0.1", () => {
  console.log(`Okami Mission Control API listening on http://localhost:${port}`);
});

server.on("error", (error) => {
  console.error(`Failed to start Okami Mission Control API: ${error.message}`);
  process.exitCode = 1;
});
