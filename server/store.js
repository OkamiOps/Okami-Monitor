import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";

const DATA_DIR = path.resolve(process.env.OKAMI_DATA_DIR || "server/.data");
const CONFIG_PATH = path.join(DATA_DIR, "config.json");
const SECRET_PATH = path.join(DATA_DIR, "secrets.json");
const SECRET_KEY_PATH = path.join(DATA_DIR, "secret.key");
const REGISTRY_PATH = path.join(DATA_DIR, "registry.json");
const AUTH_PATH = path.join(DATA_DIR, "auth.json");
const SECRET_ALGORITHM = "aes-256-gcm";

const defaultConfig = {
  sshHost: "",
  sshUser: "root",
  sshPort: 22,
  sshAuthMethod: "key",
  sshKeyPath: "",
  sshPasswordRef: "",
  hermesHome: "~/.hermes",
  terminalBackend: "ssh",
  dailyBudget: "$25.00",
  routingMode: "Custo + qualidade",
  persistentShell: true,
  auditTrail: true,
};

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true, mode: 0o700 });
  await chmod(DATA_DIR, 0o700).catch(() => {});
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, data) {
  await ensureDataDir();
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  await chmod(filePath, 0o600).catch(() => {});
}

export function fingerprintSecret(value) {
  return `SHA256:${createHash("sha256").update(value).digest("base64").replace(/=+$/, "").slice(0, 32)}`;
}

function hashToken(value) {
  return createHash("sha256").update(String(value)).digest("base64url");
}

async function getSecretKey() {
  await ensureDataDir();
  try {
    const raw = (await readFile(SECRET_KEY_PATH, "utf8")).trim();
    const key = Buffer.from(raw, "base64");
    if (key.length === 32) return key;
  } catch {}

  const key = randomBytes(32);
  await writeFile(SECRET_KEY_PATH, `${key.toString("base64")}\n`, { mode: 0o600 });
  await chmod(SECRET_KEY_PATH, 0o600).catch(() => {});
  return key;
}

async function sealSecret(value) {
  const key = await getSecretKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(SECRET_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);

  return {
    v: 1,
    alg: SECRET_ALGORITHM,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: encrypted.toString("base64"),
  };
}

async function openSecret(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value?.v !== 1 || value?.alg !== SECRET_ALGORITHM) return "";

  const key = await getSecretKey();
  const decipher = createDecipheriv(SECRET_ALGORITHM, key, Buffer.from(value.iv, "base64"));
  decipher.setAuthTag(Buffer.from(value.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(value.data, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

async function migrateSecrets() {
  const secrets = await readJson(SECRET_PATH, {});
  let changed = false;
  for (const [ref, value] of Object.entries(secrets)) {
    if (typeof value === "string") {
      secrets[ref] = await sealSecret(value);
      changed = true;
    }
  }
  if (changed) await writeJson(SECRET_PATH, secrets);
}

export async function hardenStoragePermissions() {
  await ensureDataDir();
  await Promise.all([CONFIG_PATH, SECRET_PATH, REGISTRY_PATH, SECRET_KEY_PATH, AUTH_PATH]
    .map((filePath) => chmod(filePath, 0o600).catch(() => {})));
  await migrateSecrets();
}

async function readAuth() {
  const auth = await readJson(AUTH_PATH, {});
  return { keys: Array.isArray(auth.keys) ? auth.keys : [] };
}

async function writeAuth(auth) {
  await writeJson(AUTH_PATH, { keys: auth.keys ?? [] });
}

export async function hasApiKeys() {
  const auth = await readAuth();
  return auth.keys.some((key) => !key.revokedAt);
}

export async function listApiKeys() {
  const auth = await readAuth();
  return auth.keys.map(({ tokenHash, ...key }) => key);
}

export async function createApiKey({ name = "Okami API Key", scopes = ["admin"], createdBy = "local-admin" } = {}) {
  const id = `key_${randomUUID()}`;
  const secret = randomBytes(32).toString("base64url");
  const token = `okami_${id}_${secret}`;
  const now = new Date().toISOString();
  const key = {
    id,
    name: String(name || "Okami API Key").slice(0, 80),
    tokenPrefix: token.slice(0, 22),
    tokenHash: hashToken(token),
    scopes: normalizeScopes(scopes),
    createdBy: String(createdBy || "local-admin").slice(0, 80),
    createdAt: now,
    lastUsedAt: null,
    revokedAt: null,
  };

  const auth = await readAuth();
  auth.keys = [key, ...auth.keys];
  await writeAuth(auth);
  const { tokenHash, ...publicKey } = key;
  return { token, key: publicKey };
}

export async function validateApiKey(token) {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const auth = await readAuth();
  const key = auth.keys.find((item) => !item.revokedAt && item.tokenHash === tokenHash);
  if (!key) return null;

  key.lastUsedAt = new Date().toISOString();
  await writeAuth(auth);
  const { tokenHash: _tokenHash, ...publicKey } = key;
  return publicKey;
}

export async function revokeApiKey(id) {
  const auth = await readAuth();
  let revoked = null;
  auth.keys = auth.keys.map((key) => {
    if (key.id !== id || key.revokedAt) return key;
    revoked = { ...key, revokedAt: new Date().toISOString() };
    return revoked;
  });
  await writeAuth(auth);
  if (!revoked) return null;
  const { tokenHash, ...publicKey } = revoked;
  return publicKey;
}

function normalizeScopes(scopes) {
  const allowed = new Set(["admin", "read", "write", "ssh", "kanban", "logs"]);
  const list = Array.isArray(scopes) ? scopes : String(scopes || "").split(",");
  const normalized = list.map((scope) => String(scope).trim()).filter((scope) => allowed.has(scope));
  return normalized.length ? [...new Set(normalized)] : ["read"];
}

export async function getConfig() {
  return {
    ...defaultConfig,
    ...(await readJson(CONFIG_PATH, {})),
  };
}

export async function saveConfig(config) {
  const safeConfig = { ...config };
  delete safeConfig.sshPassword;
  await writeJson(CONFIG_PATH, safeConfig);
  return safeConfig;
}

export async function saveSecret(value, prefix = "secret") {
  const secrets = await readJson(SECRET_PATH, {});
  const id = `${prefix}_${randomUUID()}`;
  const ref = `vault://${prefix}/${id}`;
  secrets[ref] = await sealSecret(value);
  await writeJson(SECRET_PATH, secrets);
  return { ref, fingerprint: fingerprintSecret(value) };
}

export async function setSecret(ref, value) {
  const secrets = await readJson(SECRET_PATH, {});
  secrets[ref] = await sealSecret(value);
  await writeJson(SECRET_PATH, secrets);
}

export async function getSecret(ref) {
  if (!ref) return "";
  const secrets = await readJson(SECRET_PATH, {});
  return openSecret(secrets[ref]);
}

export async function deleteSecret(ref) {
  const secrets = await readJson(SECRET_PATH, {});
  delete secrets[ref];
  await writeJson(SECRET_PATH, secrets);
}

export async function getRegistry(namespace, fallback = []) {
  const registry = await readJson(REGISTRY_PATH, {});
  return registry[namespace] ?? fallback;
}

export async function saveRegistry(namespace, items) {
  const registry = await readJson(REGISTRY_PATH, {});
  registry[namespace] = items;
  await writeJson(REGISTRY_PATH, registry);
  return items;
}

export async function upsertRegistryItem(namespace, item, fallback = []) {
  const items = await getRegistry(namespace, fallback);
  const nextItems = items.some((current) => current.id === item.id)
    ? items.map((current) => (current.id === item.id ? { ...current, ...item } : current))
    : [item, ...items];
  await saveRegistry(namespace, nextItems);
  return item;
}

export async function deleteRegistryItem(namespace, id, fallback = []) {
  const items = await getRegistry(namespace, fallback);
  const nextItems = items.filter((item) => item.id !== id);
  await saveRegistry(namespace, nextItems);
  return { deleted: true, id };
}

export const store = {
  getConfig,
  saveConfig,
  saveSecret,
  setSecret,
  getSecret,
  deleteSecret,
  getRegistry,
  saveRegistry,
  upsertRegistryItem,
  deleteRegistryItem,
  hardenStoragePermissions,
  hasApiKeys,
  listApiKeys,
  createApiKey,
  validateApiKey,
  revokeApiKey,
};
