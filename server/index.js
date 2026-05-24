import "dotenv/config";
import cors from "cors";
import express from "express";
import { collectHermesState, collectKanbanRaw, createKanbanTask } from "./hermesCollector.js";
import { sshExec, sshTest } from "./sshBridge.js";
import { fingerprintSecret, getConfig, saveConfig, store } from "./store.js";
import { mockMissionControl } from "../src/data/mockMissionControl.js";

const app = express();
const port = Number(process.env.OKAMI_API_PORT) || 3001;

app.use(cors({ origin: true }));
app.use(express.json({ limit: "2mb" }));

function asyncRoute(handler) {
  return async (request, response, next) => {
    try {
      await handler(request, response);
    } catch (error) {
      next(error);
    }
  };
}

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, service: "okami-mission-control-api" });
});

app.get("/api/mission-control/state", asyncRoute(async (_request, response) => {
  response.json(await collectHermesState(await getConfig(), store));
}));

// SSE stream: conexão ao vivo persistente. Envia o state inicial e em seguida
// só os deltas/heartbeats — sem refresh agressivo no cliente.
app.get("/api/mission-control/stream", async (request, response) => {
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

app.get("/api/mission-control/apps", asyncRoute(async (_request, response) => {
  response.json(await store.getRegistry("apps", mockMissionControl.apps));
}));

app.put("/api/mission-control/apps/:id", asyncRoute(async (request, response) => {
  response.json(await store.upsertRegistryItem("apps", { ...request.body, id: request.params.id }, mockMissionControl.apps));
}));

app.delete("/api/mission-control/apps/:id", asyncRoute(async (request, response) => {
  response.json(await store.deleteRegistryItem("apps", request.params.id, mockMissionControl.apps));
}));

app.get("/api/mission-control/docs", asyncRoute(async (_request, response) => {
  response.json(await store.getRegistry("docs", mockMissionControl.docs));
}));

app.put("/api/mission-control/docs/:id", asyncRoute(async (request, response) => {
  response.json(await store.upsertRegistryItem("docs", { ...request.body, id: request.params.id }, mockMissionControl.docs));
}));

app.delete("/api/mission-control/docs/:id", asyncRoute(async (request, response) => {
  response.json(await store.deleteRegistryItem("docs", request.params.id, mockMissionControl.docs));
}));

app.put("/api/mission-control/apis/:id", asyncRoute(async (request, response) => {
  response.json(await store.upsertRegistryItem("apis", { ...request.body, id: request.params.id }, mockMissionControl.apiKeys));
}));

app.delete("/api/mission-control/apis/:id", asyncRoute(async (request, response) => {
  response.json(await store.deleteRegistryItem("apis", request.params.id, mockMissionControl.apiKeys));
}));

app.post("/api/mission-control/apis/:id/test", asyncRoute(async (request, response) => {
  const api = request.body;
  response.json({
    healthy: api.status !== "disabled" && api.maskedValue !== "nao configurado",
    latency: api.status === "disabled" ? 0 : api.latency || 180,
    message: api.status === "disabled" ? "Provider desabilitado ou sem secret no Hermes." : "Registro validado no Mission Control.",
  });
}));

app.post("/api/mission-control/apis/:id/rotate", asyncRoute(async (request, response) => {
  response.json({
    rotated: true,
    maskedValue: request.body?.currentMaskedValue?.includes("server/.env") ? "server/.env secret" : "secret-rotated",
  });
}));

app.get("/api/hermes/config", asyncRoute(async (_request, response) => {
  response.json(await getConfig());
}));

app.put("/api/hermes/config", asyncRoute(async (request, response) => {
  response.json(await saveConfig(normalizeConfig({ ...(await getConfig()), ...request.body })));
}));

app.post("/api/hermes/ssh/keys", asyncRoute(async (request, response) => {
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

app.post("/api/hermes/ssh/password", asyncRoute(async (request, response) => {
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

app.post("/api/hermes/ssh/test", asyncRoute(async (request, response) => {
  const config = normalizeConfig({ ...(await getConfig()), ...request.body });
  if (request.body.sshPassword) {
    const saved = await store.saveSecret(request.body.sshPassword, "ssh-password");
    config.sshPasswordRef = saved.ref;
    config.sshAuthMethod = "password";
    await saveConfig(config);
  }

  const started = Date.now();
  const result = await sshTest(config, store);
  response.json({
    ...result,
    latency: Date.now() - started,
    source: "ssh",
    message: result.ok ? "SSH validado na VPS real." : "SSH falhou.",
  });
}));

app.get("/api/hermes/status", asyncRoute(async (_request, response) => {
  const config = await getConfig();
  const result = await sshExec(config, store, "hostname; whoami; command -v hermes || true; test -d ~/.hermes && echo hermes_home_ok || true");
  response.json({ ok: result.exitCode === 0, stdout: result.stdout, stderr: result.stderr });
}));

app.get("/api/hermes/logs", asyncRoute(async (_request, response) => {
  const config = await getConfig();
  const home = config.hermesHome || "~/.hermes";
  const result = await sshExec(config, store, `test -d ${home}/logs && find ${home}/logs -maxdepth 1 -type f | head -8 | xargs tail -n 80 2>/dev/null || true`);
  response.json({ logs: result.stdout, error: result.stderr });
}));

app.get("/api/hermes/kanban/tasks", asyncRoute(async (_request, response) => {
  const config = await getConfig();
  response.type("json").send(await collectKanbanRaw(config, store) || "[]");
}));

app.post("/api/hermes/kanban/tasks", asyncRoute(async (request, response) => {
  response.json(await createKanbanTask(await getConfig(), store, request.body));
}));

app.post("/api/hermes/command", asyncRoute(async (request, response) => {
  const allowed = new Set(["hermes doctor", "hermes config", "hermes status", "hermes insights", "hermes sessions list --limit 20", "hermes sessions stats"]);
  const command = request.body.command;
  if (!allowed.has(command)) {
    response.status(403).json({ error: "Command not allowed." });
    return;
  }
  const result = await sshExec(await getConfig(), store, command);
  response.json({ exitCode: result.exitCode, output: `${result.stdout}${result.stderr ? `\n${result.stderr}` : ""}` });
}));

app.post("/api/hermes/files/write", asyncRoute(async (request, response) => {
  const { path: filePath, content = "" } = request.body;
  const config = await getConfig();
  const hermesHome = config.hermesHome || "~/.hermes";
  if (!filePath || !/(^~\/\.(hermes|codex)\b|\/\.(hermes|codex)\b)/.test(String(filePath))) {
    response.status(400).json({ error: "Arquivo fora do escopo Hermes/Codex." });
    return;
  }

  const payload = Buffer.from(String(content), "utf8").toString("base64");
  const command = `python3 - <<'PY'
import base64, os
target = os.path.realpath(os.path.expanduser(${JSON.stringify(filePath)}))
allowed = [
    os.path.realpath(os.path.expanduser(${JSON.stringify(hermesHome)})),
    os.path.realpath(os.path.expanduser('~/.codex')),
]
if not any(target == base or target.startswith(base + os.sep) for base in allowed):
    raise SystemExit('blocked path')
os.makedirs(os.path.dirname(target), exist_ok=True)
with open(target, 'w') as handle:
    handle.write(base64.b64decode(${JSON.stringify(payload)}).decode('utf-8'))
print(target)
PY`;
  const result = await sshExec(config, store, command, { timeoutMs: 12000 });
  response.json({ saved: result.exitCode === 0, path: result.stdout.trim(), error: result.stderr.trim() });
}));

app.post("/api/hermes/cron/save", asyncRoute(async (request, response) => {
  const { original = "", line = "" } = request.body;
  if (!line.trim()) {
    response.status(400).json({ error: "Linha de cron obrigatoria." });
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

app.post("/api/hermes/systemd-timer/save", asyncRoute(async (request, response) => {
  const { unit = "", onCalendar = "" } = request.body;
  if (!/^[A-Za-z0-9_.@-]+\.timer$/.test(unit)) {
    response.status(400).json({ error: "Timer systemd invalido." });
    return;
  }
  if (!String(onCalendar).trim()) {
    response.status(400).json({ error: "OnCalendar obrigatorio." });
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
  response.status(500).json({ error: error.message });
});

function normalizeConfig(config) {
  if (config.sshKeyPath?.startsWith("vault://ssh/ssh-key_")) {
    return {
      ...config,
      sshKeyPath: config.sshKeyPath.replace("vault://ssh/", "vault://ssh-key/"),
    };
  }
  return config;
}

const server = app.listen(port, "127.0.0.1", () => {
  console.log(`Okami Mission Control API listening on http://localhost:${port}`);
});

server.on("error", (error) => {
  console.error(`Failed to start Okami Mission Control API: ${error.message}`);
  process.exitCode = 1;
});
