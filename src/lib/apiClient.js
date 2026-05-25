import { mockMissionControl } from "../data/mockMissionControl";

const rawApiBaseUrl = import.meta.env.VITE_OKAMI_API_BASE_URL;
const API_BASE_URL = rawApiBaseUrl === "same-origin"
  ? ""
  : rawApiBaseUrl?.replace(/\/$/, "");
const API_TOKEN = import.meta.env.VITE_OKAMI_API_TOKEN;

export function isMissionApiConfigured() {
  return rawApiBaseUrl === "same-origin" || Boolean(API_BASE_URL);
}

async function request(path, options = {}) {
  if (!isMissionApiConfigured()) {
    return { data: null, source: "mock", error: null };
  }

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (API_TOKEN) {
    headers.Authorization = `Bearer ${API_TOKEN}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      detail = body.error ?? body.message ?? detail;
    } catch {
      detail = await response.text().catch(() => detail);
    }
    throw new Error(`API ${response.status}: ${detail}`);
  }

  return {
    data: await response.json(),
    source: "api",
    error: null,
  };
}

export async function getMissionControlState() {
  try {
    const result = await request("/api/mission-control/state");
    return {
      data: result.data ?? mockMissionControl,
      source: result.source,
      error: null,
    };
  } catch (error) {
    return {
      data: mockMissionControl,
      source: "mock",
      error,
    };
  }
}

export async function saveHermesConfig(config) {
  const result = await request("/api/hermes/config", {
    method: "PUT",
    body: JSON.stringify(config),
  });

  return result.data ?? { saved: true, config };
}

export async function testHermesSshConnection(config) {
  const result = await request("/api/hermes/ssh/test", {
    method: "POST",
    body: JSON.stringify(config),
  });

  return result.data ?? {
    ok: Boolean(config.sshHost && config.sshUser),
    latency: 146,
    source: "mock",
    message: config.sshHost && config.sshUser
      ? "Mock OK: pre-validacao local. Configure VITE_OKAMI_API_BASE_URL para testar a VPS de verdade."
      : "Informe host e usuario SSH.",
  };
}

export async function saveHermesSshPassword({ host, user, port, password }) {
  const result = await request("/api/hermes/ssh/password", {
    method: "POST",
    body: JSON.stringify({ host, user, port, password }),
  });

  return result.data ?? {
    passwordRef: `vault://ssh-password/${Date.now()}`,
    storage: "mock local only",
    source: "mock",
  };
}

export async function uploadHermesSshKey({ name, privateKey, passphrase }) {
  const result = await request("/api/hermes/ssh/keys", {
    method: "POST",
    body: JSON.stringify({ name, privateKey, passphrase }),
  });

  return result.data ?? {
    keyId: `key_${Date.now()}`,
    name,
    fingerprint: "SHA256:mock-redacted",
    storage: "encrypted backend vault",
  };
}

export async function runHermesCommand(command) {
  const result = await request("/api/hermes/command", {
    method: "POST",
    body: JSON.stringify({ command }),
  });

  return result.data ?? {
    exitCode: 0,
    output: `$ ${command}\nmock: comando preparado para execucao via SSH na VPS`,
  };
}

export async function saveHermesFile(path, content) {
  const result = await request("/api/hermes/files/write", {
    method: "POST",
    body: JSON.stringify({ path, content }),
  });

  return result.data ?? { saved: true, path };
}

export async function saveHermesCron(original, line) {
  const result = await request("/api/hermes/cron/save", {
    method: "POST",
    body: JSON.stringify({ original, line }),
  });

  return result.data ?? { saved: true, output: "mock cron saved" };
}

export async function saveHermesSystemdTimer(unit, onCalendar) {
  const result = await request("/api/hermes/systemd-timer/save", {
    method: "POST",
    body: JSON.stringify({ unit, onCalendar }),
  });

  return result.data ?? { saved: true, output: "mock systemd timer saved" };
}

export async function createHermesKanbanTask(task) {
  const result = await request("/api/hermes/kanban/tasks", {
    method: "POST",
    body: JSON.stringify(task),
  });

  return result.data ?? {
    id: `t_${Date.now().toString(16)}`,
    status: task.status ?? "triage",
    ...task,
  };
}

export async function updateHermesKanbanTask(taskId, patch) {
  const result = await request(`/api/hermes/kanban/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });

  return result.data ?? { id: taskId, ...patch };
}

export async function saveApiConfig(api) {
  const result = await request(`/api/mission-control/apis/${api.id}`, {
    method: "PUT",
    body: JSON.stringify(api),
  });

  return result.data ?? { saved: true, api };
}

export async function testApiConnection(api) {
  const result = await request(`/api/mission-control/apis/${api.id}/test`, {
    method: "POST",
    body: JSON.stringify(api),
  });

  return result.data ?? {
    healthy: api.status !== "disabled",
    latency: api.latency,
    message: api.status === "disabled" ? "API desabilitada no mock" : "Conexao validada no mock",
  };
}

export async function rotateApiSecret(api) {
  const result = await request(`/api/mission-control/apis/${api.id}/rotate`, {
    method: "POST",
    body: JSON.stringify({ currentMaskedValue: api.maskedValue }),
  });

  return result.data ?? {
    maskedValue: `${api.name.toLowerCase().replaceAll(" ", "-")}-••••new`,
    rotated: true,
  };
}

export async function deleteApiConfig(api) {
  const result = await request(`/api/mission-control/apis/${api.id}`, {
    method: "DELETE",
  });

  return result.data ?? { deleted: true };
}

export async function saveAppConfig(app) {
  const result = await request(`/api/mission-control/apps/${app.id}`, {
    method: "PUT",
    body: JSON.stringify(app),
  });

  return result.data ?? app;
}

export async function deleteAppConfig(app) {
  const result = await request(`/api/mission-control/apps/${app.id}`, {
    method: "DELETE",
  });

  return result.data ?? { deleted: true };
}

export async function saveDocConfig(doc) {
  const result = await request(`/api/mission-control/docs/${doc.id}`, {
    method: "PUT",
    body: JSON.stringify(doc),
  });

  return result.data ?? doc;
}

export async function deleteDocConfig(doc) {
  const result = await request(`/api/mission-control/docs/${doc.id}`, {
    method: "DELETE",
  });

  return result.data ?? { deleted: true };
}
