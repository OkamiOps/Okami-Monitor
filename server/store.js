import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";

const DATA_DIR = path.resolve("server/.data");
const CONFIG_PATH = path.join(DATA_DIR, "config.json");
const SECRET_PATH = path.join(DATA_DIR, "secrets.json");
const REGISTRY_PATH = path.join(DATA_DIR, "registry.json");

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
  await mkdir(DATA_DIR, { recursive: true });
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
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

export function fingerprintSecret(value) {
  return `SHA256:${createHash("sha256").update(value).digest("base64").replace(/=+$/, "").slice(0, 32)}`;
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
  secrets[ref] = value;
  await writeJson(SECRET_PATH, secrets);
  return { ref, fingerprint: fingerprintSecret(value) };
}

export async function setSecret(ref, value) {
  const secrets = await readJson(SECRET_PATH, {});
  secrets[ref] = value;
  await writeJson(SECRET_PATH, secrets);
}

export async function getSecret(ref) {
  if (!ref) return "";
  const secrets = await readJson(SECRET_PATH, {});
  return secrets[ref] ?? "";
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
};
