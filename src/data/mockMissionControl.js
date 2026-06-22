// Analytics sintético para o modo demo/mock: 24 baldes de hora-do-dia e 30 dias
// de calendário (ancorados em datas reais terminando hoje). Sem isto, todos os
// ranges do Overview (1h/24h/7d/30d) caíam no mesmo fallback e o filtro parecia
// "de enfeite". Com dados reais do Hermes via SSH, este bloco é substituído.
const MOCK_NOW = new Date();
const mockHourBuckets = Array.from({ length: 24 }, (_, index) => {
  const input = 14000 + Math.round(11000 * Math.abs(Math.sin((index + 1) / 3.1)));
  const output = 9000 + Math.round(8000 * Math.abs(Math.cos((index + 2) / 4.3)));
  return { bucket: String(index).padStart(2, "0"), input_tokens: input, output_tokens: output, tokens: input + output };
});
const mockDayBuckets = Array.from({ length: 30 }, (_, index) => {
  const date = new Date(MOCK_NOW);
  date.setUTCDate(date.getUTCDate() - (29 - index));
  const input = 95000 + Math.round(90000 * Math.abs(Math.sin((index + 1) / 5.5)));
  const output = 60000 + Math.round(70000 * Math.abs(Math.cos((index + 1) / 6.7)));
  return {
    bucket: date.toISOString().slice(0, 10),
    input_tokens: input,
    output_tokens: output,
    tokens: input + output,
    sessions: 3 + (index % 6),
  };
});
const mockAnalytics = { hours: mockHourBuckets, days: mockDayBuckets };

const baseMissionControl = {
  status: {
    label: "Hermes online",
    detail: "Proxy seguro · 4 agentes ativos",
    healthy: true,
    updatedAt: new Date().toISOString(),
  },
  metrics: [
    { label: "tokens hoje", value: "304.3k", delta: "+18% vs ontem", hot: true },
    { label: "custo hoje", value: "$6.18", delta: "-7% via roteamento" },
    { label: "tarefas ativas", value: "12", delta: "5 em coding loop" },
    { label: "servicos hit", value: "10", delta: "8 healthy · 2 riscos" },
  ],
  tokenSeries: {
    input: [41, 54, 33, 47, 82, 64, 36, 69, 78, 58, 73, 61],
    output: [52, 40, 68, 45, 38, 61, 72, 54, 66, 49, 37, 58],
  },
  overview: {
    serviceHealth: [
      { name: "Hermes Core", value: 99.98, status: "healthy" },
      { name: "Gateway LLM", value: 99.91, status: "healthy" },
      { name: "VPS Proxy", value: 98.72, status: "watch" },
      { name: "Agent Streams", value: 96.4, status: "watch" },
    ],
    queue: [
      { label: "coding", value: 5 },
      { label: "research", value: 3 },
      { label: "docs", value: 2 },
      { label: "review", value: 2 },
    ],
    incidents: [
      { severity: "P2", title: "Proxy Hermes com latencia acima do alvo", owner: "Gateway", eta: "18 min" },
      { severity: "P3", title: "Scout aguardando credencial da VPS", owner: "Scout", eta: "manual" },
    ],
  },
  models: [
    { name: "claude-opus-4.5", share: 62 },
    { name: "claude-sonnet-4.5", share: 25 },
    { name: "gpt-5.4", share: 10 },
    { name: "kimi-k2.5", share: 3 },
  ],
  activity: [
    { actor: "Hermes", message: "Recebeu brief do WhatsApp gateway", status: "OK", tone: "ok" },
    { actor: "Coder-1", message: "Gerando UI de dashboards responsivos", status: "OK", tone: "ok" },
    { actor: "Scout", message: "Monitorando concorrentes e docs", status: "OK", tone: "ok" },
    { actor: "Gateway", message: "Fallback para OpenRouter acionado", status: "Retry", tone: "warn" },
  ],
  skills: ["morning-briefing", "github-pr-review", "calendar-sync", "expense-tracker", "deploy-watch"],
  subscriptions: [
    {
      id: "codex",
      name: "Codex",
      plan: "US200",
      monthlyCost: 200,
      dailyUsed: 8.4,
      weeklyUsed: 51.8,
      monthlyForecast: 224,
      utilization: 112,
      trend: "+18%",
      recommendation: "Manter por enquanto, mas limitar agentes de review fora do horario de trabalho.",
      action: "monitorar",
      dailySeries: [6.8, 7.4, 8.1, 6.9, 9.2, 8.8, 8.4],
    },
    {
      id: "claude-code",
      name: "Claude Code",
      plan: "US100",
      monthlyCost: 100,
      dailyUsed: 2.1,
      weeklyUsed: 13.7,
      monthlyForecast: 61,
      utilization: 61,
      trend: "-6%",
      recommendation: "Pode rebaixar se Codex assumir mais tarefas de implementacao.",
      action: "rebaixar",
      dailySeries: [3.8, 3.1, 2.9, 2.4, 2.2, 2.0, 2.1],
    },
    {
      id: "glm",
      name: "GLM",
      plan: "US10",
      monthlyCost: 10,
      dailyUsed: 0.14,
      weeklyUsed: 0.8,
      monthlyForecast: 3,
      utilization: 30,
      trend: "-2%",
      recommendation: "Baixo custo e uso pontual. Manter como fallback barato.",
      action: "manter",
      dailySeries: [0.08, 0.12, 0.2, 0.09, 0.1, 0.07, 0.14],
    },
    {
      id: "kimi",
      name: "Kimi Coding",
      plan: "US20",
      monthlyCost: 20,
      dailyUsed: 0.22,
      weeklyUsed: 1.4,
      monthlyForecast: 6,
      utilization: 30,
      trend: "-11%",
      recommendation: "Candidato a cancelar se nao houver tarefas long-context na semana.",
      action: "avaliar",
      dailySeries: [0.9, 0.4, 0.2, 0.16, 0.21, 0.17, 0.22],
    },
    {
      id: "xiaomi",
      name: "Xiaomi",
      plan: "US10",
      monthlyCost: 10,
      dailyUsed: 0.05,
      weeklyUsed: 0.2,
      monthlyForecast: 1,
      utilization: 10,
      trend: "-18%",
      recommendation: "Cancelar ou pausar se nao estiver ligado a automacoes essenciais.",
      action: "cancelar",
      dailySeries: [0.03, 0.04, 0.02, 0.03, 0.01, 0.04, 0.05],
    },
    {
      id: "minimax",
      name: "MiniMax",
      plan: "US20",
      monthlyCost: 20,
      dailyUsed: 0.34,
      weeklyUsed: 2.2,
      monthlyForecast: 9,
      utilization: 45,
      trend: "+4%",
      recommendation: "Manter como laboratorio, mas sem permitir consumo automatico.",
      action: "manter",
      dailySeries: [0.18, 0.24, 0.29, 0.33, 0.27, 0.55, 0.34],
    },
  ],
  agents: [
    {
      id: "hermes",
      name: "Hermes",
      role: "orchestrator",
      color: "orange",
      status: "active",
      currentTask: "Roteando tarefas entre agentes e gateway LLM",
      project: "Okami Mission Control",
      branch: "main",
      workspace: "/srv/okami/hermes",
      progress: 76,
      tool: "Hermes Core",
      monitorTitle: "orchestration loop",
      monitorLines: [
        "route: incoming_event -> agent_pool",
        "policy: cost_quality balanced",
        "memory: project context loaded",
        "queue: 12 tasks / 4 active agents",
      ],
      logs: [
        "21:07:02 sincronizou memoria do projeto",
        "21:07:18 atribuiu tarefa UI para coder-1",
        "21:08:11 validou fallback OpenRouter",
      ],
    },
    {
      id: "coder-1",
      name: "Coder-1",
      role: "frontend engineer",
      color: "magenta",
      status: "coding",
      currentTask: "Refinar Office interativo com painel de monitor",
      project: "Okami-Monitor",
      branch: "codex-mission-control-ui",
      workspace: "/srv/agents/coder-1/workspace",
      progress: 58,
      tool: "Codex CLI",
      monitorTitle: "src/App.jsx",
      monitorLines: [
        "function Office({ data }) {",
        "  const [selectedAgentId, setSelectedAgentId] = useState(...);",
        "  return <AgentMonitor agent={selectedAgent} />;",
        "}",
      ],
      logs: [
        "21:06:44 abriu branch feature/ui",
        "21:07:40 removeu pixel-map legado",
        "21:08:24 renderizou workstation cards",
      ],
    },
    {
      id: "scout",
      name: "Scout",
      role: "research",
      color: "success",
      status: "observing",
      currentTask: "Catalogar endpoints e documentacao da VPS",
      project: "Hermes Gateway",
      branch: "research/hostinger-api",
      workspace: "/srv/agents/scout",
      progress: 34,
      tool: "Browser + Docs",
      monitorTitle: "endpoint inventory",
      monitorLines: [
        "GET /health",
        "GET /api/mission-control/state",
        "WS  /api/agents/:id/session",
        "PUT /api/hermes/config",
      ],
      logs: [
        "21:05:12 verificou status da VPS",
        "21:06:55 mapeou endpoints Hermes",
        "21:08:03 aguardando token de API",
      ],
    },
    {
      id: "writer",
      name: "Writer",
      role: "technical writer",
      color: "cyan",
      status: "drafting",
      currentTask: "Atualizar runbook de conexao Hostinger",
      project: "Okami Docs",
      branch: "docs/mission-control",
      workspace: "/srv/agents/writer",
      progress: 42,
      tool: "Docs",
      monitorTitle: "runbook.md",
      monitorLines: [
        "# Hostinger VPS integration",
        "1. Configure reverse proxy",
        "2. Export API token",
        "3. Enable mission-control endpoint",
      ],
      logs: [
        "21:04:31 abriu runbook",
        "21:06:21 adicionou variaveis .env",
        "21:07:52 revisando politica de secrets",
      ],
    },
    {
      id: "codex",
      name: "Codex",
      role: "review",
      color: "warning",
      status: "reviewing",
      currentTask: "Checar build, responsividade e contrato da API",
      project: "Okami-Monitor",
      branch: "codex-mission-control-ui",
      workspace: "/Users/marcos/Documents/New project/Okami-Monitor",
      progress: 66,
      tool: "Codex",
      monitorTitle: "verification",
      monitorLines: [
        "npm run build",
        "browser: #office desktop/mobile",
        "contract: mission-control/state",
        "risk: wire real websocket later",
      ],
      logs: [
        "21:08:11 aguardando checks locais",
        "21:09:04 validou Vite build",
        "21:09:49 revisando Office UX",
      ],
    },
  ],
  liveEvents: [
    { time: "21:06:44", message: "coder-1 abriu branch feature/ui" },
    { time: "21:07:02", message: "hermes sincronizou memoria do projeto" },
    { time: "21:07:18", message: "scout anexou 3 links de referencia" },
    { time: "21:08:11", message: "codex aguardando checks locais" },
  ],
  kanban: {
    Backlog: [
      { title: "Conectar Supabase metrics", meta: "Hermes · API", priority: "P1", owner: "Hermes", estimate: "4h", board: "Okami Core" },
      { title: "Mapa de custos por cliente", meta: "Finance · Data", priority: "P2", owner: "Codex", estimate: "6h", board: "Cliente Aurora" },
    ],
    "Em progresso": [
      { title: "Mission Control mobile", meta: "Codex · UI", hot: true, priority: "P1", owner: "Coder-1", estimate: "2h", board: "Okami Core" },
      { title: "Proxy reverso Hermes", meta: "Gateway · Infra", priority: "P1", owner: "Hermes", estimate: "1d", board: "Okami Core" },
    ],
    Review: [{ title: "Docs de instalacao CLI", meta: "Writer · Docs", priority: "P2", owner: "Writer", estimate: "40m", board: "Cliente Aurora" }],
    Done: [{ title: "Inventario de apps", meta: "Scout · Links", priority: "P3", owner: "Scout", estimate: "done", board: "Cliente Aurora" }],
  },
  apiKeys: [
    { id: "openai", name: "OpenAI", maskedValue: "openai-token-masked", detail: "Produção · rotacao em 18d", latency: 310, usage: 46, status: "healthy" },
    { id: "anthropic", name: "Anthropic", maskedValue: "anthropic-token-masked", detail: "Hermes · fallback ativo", latency: 280, usage: 61, status: "healthy" },
    { id: "openrouter", name: "OpenRouter", maskedValue: "openrouter-token-masked", detail: "Rate limit 82%", latency: 520, usage: 82, status: "watch" },
    { id: "github", name: "GitHub", maskedValue: "github-token-masked", detail: "Repos OkamiOps", latency: 190, usage: 33, status: "healthy" },
  ],
  apps: [
    { name: "Okami Site", url: "https://okami-site.msant262.workers.dev", detail: "workers.dev", status: "Online", uptime: 99.99, env: "prod" },
    { name: "Hermes Dashboard", url: "#", detail: "localhost proxy", status: "Proxy", uptime: 98.7, env: "private" },
    { name: "Gateway LLM", url: "#", detail: "api.okamiops", status: "Healthy", uptime: 99.91, env: "prod" },
    { name: "Docs Portal", url: "#", detail: "runbooks + playbooks", status: "Draft", uptime: 100, env: "stage" },
  ],
  docs: [
    {
      id: "runbooks",
      title: "Runbooks",
      body: "Deploy, rollback, incidentes e proxy Hermes.",
      updated: "hoje",
      coverage: 72,
      source: "docs/runbooks.md",
      content: "# Runbooks\n\n## Deploy\n- Validar saude do gateway antes do release.\n- Conferir logs do Hermes via ponte SSH.\n- Registrar snapshot de sessions, tokens e skills.\n\n## Rollback\n- Pausar novas execucoes.\n- Restaurar build anterior.\n- Reprocessar tarefas bloqueadas no Kanban.",
    },
    {
      id: "agent-briefs",
      title: "Agent Briefs",
      body: "Objetivos, ferramentas, limites e rotinas por agente.",
      updated: "ontem",
      coverage: 81,
      source: "docs/agent-briefs.md",
      content: "# Agent Briefs\n\n## Diana\nResponsavel por revisao visual, consistencia de interface e tarefas de acabamento.\n\n## Morgana\nResponsavel por curadoria de sessoes, memoria e documentacao operacional.\n\n## Zelda\nResponsavel por metricas, reconciliacao de dados e painels de uso.",
    },
    {
      id: "system-design",
      title: "System Design",
      body: "Tokens, componentes, tom visual e padroes Okami.",
      updated: "hoje",
      coverage: 94,
      source: "okami-design-system",
      content: "# Okami System Design\n\n- Base escura com grid tecnico discreto.\n- Acentos distribuidos entre cyan, magenta, laranja e verde.\n- Cards com bordas finas, informacao densa e contraste controlado.\n- Texto operacional curto, sem marketing dentro do produto.",
    },
  ],
  hermes: {
    analytics: mockAnalytics,
    accessMode: "private-ssh",
    sshHost: "vps-hostinger.okami.internal",
    sshUser: "root",
    sshPort: 22,
    sshKeyPath: "vault://ssh/hostinger-hermes",
    sshKeyFingerprint: "SHA256:aguardando-upload",
    sshKeyStorage: "cofre cifrado do servidor",
    sshAuthMethod: "key",
    sshPasswordRef: "",
    hermesHome: "~/.hermes",
    configPath: "~/.hermes/config.yaml",
    envPath: "~/.hermes/.env",
    stateDbPath: "~/.hermes/state.db",
    kanbanDbPath: "~/.hermes/kanban.db",
    sessionsPath: "~/.hermes/sessions",
    logsPath: "~/.hermes/logs",
    gatewayPidPath: "~/.hermes/gateway.pid",
    terminalBackend: "ssh",
    persistentShell: true,
    publicEndpoint: "privado via SSH",
    localDashboard: "sem endpoint publico",
    routingMode: "Custo + qualidade",
    dailyBudget: "$25.00",
    reverseProxy: false,
    auditTrail: true,
    sshStatus: {
      status: "needs-check",
      latency: "146ms",
      lastCheck: "aguardando teste real",
    },
    runtime: [
      { label: "executor", value: "ssh" },
      { label: "persistent_shell", value: "true" },
      { label: "state store", value: "SQLite + JSONL" },
      { label: "access", value: "SSH only" },
    ],
    requiredEnv: [
      { key: "TERMINAL_SSH_HOST", value: "vps-hostinger.okami.internal", status: "required" },
      { key: "TERMINAL_SSH_USER", value: "root", status: "required" },
      { key: "TERMINAL_SSH_PORT", value: "22", status: "optional" },
      { key: "TERMINAL_SSH_KEY", value: "~/.ssh/okami_hostinger", status: "optional" },
    ],
    routes: [
      { group: "SSH", method: "POST", path: "/api/hermes/ssh/keys", purpose: "receber chave, criptografar no servidor e retornar keyId/fingerprint" },
      { group: "SSH", method: "GET", path: "/api/hermes/ssh/keys", purpose: "listar fingerprints e keyIds, nunca retornar private key" },
      { group: "SSH", method: "DELETE", path: "/api/hermes/ssh/keys/:keyId", purpose: "remover chave do cofre" },
      { group: "SSH", method: "POST", path: "/api/hermes/ssh/test", purpose: "validar host/user/porta/keyId com BatchMode=yes" },
      { group: "Core", method: "GET", path: "/api/hermes/status", purpose: "health, versao, pid, uptime, gateway e servidor ativo" },
      { group: "Core", method: "GET", path: "/api/hermes/health/detailed", purpose: "proxy para health detalhado ou coleta via SSH" },
      { group: "Core", method: "GET", path: "/api/hermes/capabilities", purpose: "descobrir API server: runs, SSE, jobs, responses" },
      { group: "Core", method: "GET", path: "/api/hermes/config", purpose: "ler ~/.hermes/config.yaml redigido" },
      { group: "Core", method: "PUT", path: "/api/hermes/config", purpose: "alterar config.yaml e variaveis permitidas" },
      { group: "Core", method: "POST", path: "/api/hermes/gateway/restart", purpose: "reiniciar gateway quando env/API server mudar" },
      { group: "Sessions", method: "GET", path: "/api/hermes/sessions", purpose: "listar state.db com source, title, tokens, timestamps" },
      { group: "Sessions", method: "GET", path: "/api/hermes/sessions/:id", purpose: "ler detalhe/transcript redigido" },
      { group: "Sessions", method: "GET", path: "/api/hermes/sessions/stats", purpose: "tokens, mensagens, fontes, tamanho do banco" },
      { group: "Kanban", method: "GET", path: "/api/hermes/kanban/boards", purpose: "listar boards em ~/.hermes/kanban.db" },
      { group: "Kanban", method: "POST", path: "/api/hermes/kanban/boards", purpose: "criar board Hermes quando necessario" },
      { group: "Kanban", method: "GET", path: "/api/hermes/kanban/tasks", purpose: "listar tasks por status, assignee, tenant, archived" },
      { group: "Kanban", method: "POST", path: "/api/hermes/kanban/tasks", purpose: "criar task via kanban_db/hermes kanban create --json" },
      { group: "Kanban", method: "GET", path: "/api/hermes/kanban/tasks/:id", purpose: "show/context/runs/comments de uma task" },
      { group: "Kanban", method: "PATCH", path: "/api/hermes/kanban/tasks/:id", purpose: "status, assignee, priority, tenant e body" },
      { group: "Kanban", method: "POST", path: "/api/hermes/kanban/tasks/:id/comment", purpose: "adicionar comentario humano/agente" },
      { group: "Kanban", method: "POST", path: "/api/hermes/kanban/tasks/:id/block", purpose: "bloquear com motivo" },
      { group: "Kanban", method: "POST", path: "/api/hermes/kanban/tasks/:id/unblock", purpose: "desbloquear task" },
      { group: "Kanban", method: "POST", path: "/api/hermes/kanban/tasks/:id/complete", purpose: "concluir com summary/metadata" },
      { group: "Kanban", method: "POST", path: "/api/hermes/kanban/tasks/:id/specify", purpose: "expandir triage em spec usando Hermes" },
      { group: "Kanban", method: "GET", path: "/api/hermes/kanban/events", purpose: "poll/SSE do task_events para atualizar Kanban" },
      { group: "Kanban", method: "GET", path: "/api/hermes/kanban/tasks/:id/log", purpose: "worker log em ~/.hermes/kanban/logs" },
      { group: "Runs", method: "POST", path: "/api/hermes/runs", purpose: "criar run no API server /v1/runs via tunnel/servidor" },
      { group: "Runs", method: "GET", path: "/api/hermes/runs/:runId", purpose: "status, output e usage" },
      { group: "Runs", method: "GET", path: "/api/hermes/runs/:runId/events", purpose: "SSE/progress para Office e Overview" },
      { group: "Jobs", method: "GET", path: "/api/hermes/jobs", purpose: "listar cron/jobs do Hermes" },
      { group: "Jobs", method: "POST", path: "/api/hermes/jobs", purpose: "criar job agendado" },
      { group: "Logs", method: "GET", path: "/api/hermes/logs", purpose: "errors.log/gateway.log redigidos" },
      { group: "Logs", method: "GET", path: "/api/hermes/logs/stream", purpose: "stream de logs redigidos para monitoramento" },
    ],
    commands: [
      { label: "Doctor", command: "hermes doctor" },
      { label: "Config", command: "hermes config" },
      { label: "Sessions", command: "hermes sessions list --limit 20" },
      { label: "Stats", command: "hermes sessions stats" },
    ],
    storage: [
      { label: "config.yaml", path: "~/.hermes/config.yaml", detail: "modelo, terminal, display, compressao" },
      { label: ".env", path: "~/.hermes/.env", detail: "API keys e tokens, nunca retornar completo" },
      { label: "state.db", path: "~/.hermes/state.db", detail: "sessoes, FTS5, tokens, timestamps" },
      { label: "kanban.db", path: "~/.hermes/kanban.db", detail: "tasks, links, comments, runs e events" },
      { label: "sessions/", path: "~/.hermes/sessions", detail: "transcritos JSONL do gateway" },
      { label: "logs/", path: "~/.hermes/logs", detail: "errors.log e gateway.log redigidos" },
    ],
    policies: [
      { name: "Acesso somente por SSH", enabled: true, impact: "sem porta publica" },
      { name: "BatchMode SSH obrigatorio", enabled: true, impact: "sem prompt interativo" },
      { name: "Redigir .env e auth.json", enabled: true, impact: "segredos protegidos" },
      { name: "Allowlist de comandos", enabled: true, impact: "evita shell aberto no browser" },
    ],
    routing: [
      { label: "Claude", value: 61 },
      { label: "Codex", value: 24 },
      { label: "Kimi", value: 9 },
      { label: "GLM", value: 6 },
    ],
  },
  cliTools: [
    { name: "Codex CLI", version: "0.48.0", status: "installed", agents: 3, lastRun: "12 min", command: "codex exec" },
    { name: "Claude Code CLI", version: "1.0.92", status: "installed", agents: 2, lastRun: "34 min", command: "claude" },
    { name: "GitHub CLI", version: "2.82.1", status: "installed", agents: 4, lastRun: "8 min", command: "gh" },
  ],
};

function cloneBase() {
  return JSON.parse(JSON.stringify(baseMissionControl));
}

function normalizeDemoDate(input = new Date()) {
  const date = input instanceof Date ? input : new Date(input);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function demoWave(tick, base, amplitude, phase = 0, decimals = 0) {
  const value = base + Math.sin((tick + phase) / 7) * amplitude + Math.cos((tick + phase) / 11) * amplitude * 0.35;
  const fixed = Number(value.toFixed(decimals));
  return decimals ? fixed : Math.round(fixed);
}

function demoClamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function demoCompact(value) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(Math.round(value));
}

function demoSeries(points, tick, amplitude = 8) {
  return points.map((point, index) => Math.max(1, demoWave(tick, point, amplitude, index * 1.7)));
}

function demoClock(now, minutesAgo = 0) {
  return new Date(now.getTime() - minutesAgo * 60_000).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function createDemoAgentRuntimes(tick) {
  const statusCycle = ["available", "connected-demo", "needs-check"];
  return [
    {
      id: "hermes",
      name: "Agente principal",
      family: "orchestrator",
      status: "connected-demo",
      command: "hermes",
      home: "~/.hermes",
      configPath: "~/.hermes/config.yaml",
      workspacePath: "~/.hermes/profiles",
      dashboardUrl: "privado via SSH",
      summary: "Agente principal do Okami com state.db, kanban.db, sessoes, skills e logs coletados via SSH.",
      recommendedScopes: ["read", "ssh", "kanban", "logs"],
      suggestedKeyName: "main-agent",
      capabilities: ["state.db + sessions", "kanban.db", "profile docs", "skills usage", "logs remotos"],
      setup: ["Configurar SSH dos agentes", "Testar comando de status", "Mapear profiles em ~/.hermes/profiles"],
      apiKey: {
        tokenPrefix: "okami_key_demo",
        scopes: ["read", "ssh", "kanban", "logs"],
        injectionStatus: "demo",
        envPath: "~/.hermes/profiles/.okami.env",
      },
      commands: [
        { label: "Doctor", command: "hermes doctor" },
        { label: "Config", command: "hermes config" },
        { label: "Sessions", command: "hermes sessions list --limit 20" },
      ],
      configs: [
        { name: "config.yaml", path: "~/.hermes/config.yaml", profile: "global", type: "yaml", content: "terminal_backend: ssh\nrouting_mode: cost_quality\npersistent_shell: true\n" },
        { name: ".env", path: "~/.hermes/.env", profile: "global", type: "env", redacted: true, content: "OPENAI_API_KEY=***\nANTHROPIC_API_KEY=***\n" },
      ],
      instances: [
        { id: "hermes", name: "Hermes", role: "orchestrator", status: "active", workspace: "~/.hermes" },
      ],
    },
    {
      id: "openclaw",
      name: "OpenClaw",
      family: "gateway",
      status: statusCycle[tick % statusCycle.length],
      command: "openclaw",
      home: "~/.openclaw",
      configPath: "~/.openclaw/openclaw.json",
      workspacePath: "~/.openclaw/workspace",
      dashboardUrl: "http://127.0.0.1:18789",
      docsUrl: "https://docs.openclaw.ai",
      summary: "Gateway self-hosted para agentes em WhatsApp, Telegram, Slack, Discord, iMessage, Matrix, WebChat e outros canais.",
      recommendedScopes: ["read", "ssh", "logs"],
      suggestedKeyName: "openclaw-gateway",
      capabilities: ["multi-channel gateway", "multi-agent routing", "workspace skills", "sessions JSONL", "config hot reload"],
      setup: ["Instalar openclaw@latest", "Rodar openclaw onboard --install-daemon", "Validar openclaw gateway status"],
      commands: [
        { label: "Doctor", command: "openclaw doctor" },
        { label: "Gateway", command: "openclaw gateway status" },
        { label: "Version", command: "openclaw --version" },
      ],
      configs: [
        { name: "openclaw.json", path: "~/.openclaw/openclaw.json", profile: "gateway", type: "json", content: "{\n  \"agents\": { \"defaults\": { \"workspace\": \"~/.openclaw/workspace\" } }\n}\n" },
        { name: "AGENTS.md", path: "~/.openclaw/workspace/AGENTS.md", profile: "workspace", type: "md", content: "# OpenClaw agent instructions\n\nOperating rules and routing constraints.\n" },
      ],
      instances: [
        { id: "openclaw-home", name: "home", role: "personal assistant", status: "planned", workspace: "~/.openclaw/workspace-home" },
        { id: "openclaw-work", name: "work", role: "work assistant", status: "planned", workspace: "~/.openclaw/workspace-work" },
      ],
    },
    {
      id: "openhuman",
      name: "OpenHuman",
      family: "personal-ai",
      status: "available",
      command: "openhuman",
      home: "~/.openhuman",
      configPath: "~/.openhuman/config.toml",
      workspacePath: "~/.openhuman/workspace",
      dashboardUrl: "desktop app",
      docsUrl: "https://tinyhumans.gitbook.io/openhuman/",
      summary: "Assistente local-first com Memory Tree, vault Markdown e integracoes OAuth.",
      recommendedScopes: ["read", "ssh", "logs"],
      suggestedKeyName: "openhuman-local",
      capabilities: ["memory tree", "obsidian vault", "auto-fetch", "desktop runtime"],
      setup: ["Instalar runtime", "Abrir onboarding", "Apontar vault e workspace local"],
      commands: [{ label: "Version", command: "openhuman --version" }],
      configs: [
        { name: "config.toml", path: "~/.openhuman/config.toml", profile: "runtime", type: "toml", content: "memory_backend = \"local\"\nvault_path = \"~/.openhuman/vault\"\n" },
        { name: "memory.md", path: "~/.openhuman/vault/memory.md", profile: "vault", type: "md", content: "# OpenHuman Memory\n\nLocal memory and operator context.\n" },
      ],
      instances: [{ id: "openhuman-main", name: "main", role: "personal ai", status: "planned", workspace: "~/.openhuman/workspace" }],
    },
    {
      id: "claude",
      name: "Claude Code",
      family: "coding-cli",
      status: "detected-local",
      command: "claude",
      home: "~/.claude",
      configPath: "~/.claude/settings.json",
      workspacePath: "project CLAUDE.md",
      dashboardUrl: "terminal",
      docsUrl: "https://code.claude.com/docs/en/overview",
      summary: "CLI de coding agent operado por workspace, CLAUDE.md e permissoes locais.",
      recommendedScopes: ["read", "ssh", "logs"],
      suggestedKeyName: "claude-code-agent",
      capabilities: ["workspace CLAUDE.md", "terminal sessions", "code review", "tool permissions"],
      setup: ["Instalar Claude Code CLI", "Criar CLAUDE.md por projeto", "Definir permissoes por workspace"],
      commands: [{ label: "Version", command: "claude --version" }],
      configs: [{ name: "settings.json", path: "~/.claude/settings.json", profile: "global", type: "json", content: "{\n  \"permissions\": {},\n  \"model\": \"claude-sonnet\"\n}\n" }],
      instances: [{ id: "claude-code", name: "Claude Code", role: "coding agent", status: "planned", workspace: "project workspace" }],
    },
    {
      id: "codex",
      name: "Codex",
      family: "coding-cli",
      status: "detected-local",
      command: "codex",
      home: "~/.codex",
      configPath: "~/.codex/config.toml",
      workspacePath: "project AGENTS.md",
      dashboardUrl: "terminal / Codex app",
      summary: "Coding agent por workspace com AGENTS.md, skills locais e execucao controlada por permissao.",
      recommendedScopes: ["read", "ssh", "logs"],
      suggestedKeyName: "codex-agent",
      capabilities: ["AGENTS.md", "skills", "terminal sessions", "code review", "browser verification"],
      setup: ["Configurar ~/.codex/config.toml", "Criar AGENTS.md no projeto", "Validar escopos e sandbox"],
      commands: [{ label: "Version", command: "codex --version" }],
      configs: [{ name: "config.toml", path: "~/.codex/config.toml", profile: "global", type: "toml", content: "model = \"gpt-5\"\napproval_policy = \"on-request\"\n" }],
      instances: [{ id: "codex", name: "Codex", role: "coding agent", status: "active", workspace: "project workspace" }],
    },
    {
      id: "custom",
      name: "Outros agentes",
      family: "generic",
      status: "template",
      command: "custom",
      home: "~/.agents",
      configPath: "~/.agents/registry.json",
      workspacePath: "~/.agents/workspaces",
      dashboardUrl: "custom",
      summary: "Template para registrar AutoGen, CrewAI, LangGraph, OpenCode, Cursor, Devin ou qualquer agente externo.",
      recommendedScopes: ["read"],
      suggestedKeyName: "custom-agent-readonly",
      capabilities: ["metadata flexivel", "config por agente", "workspace isolado", "chave por agente"],
      setup: ["Definir comando de teste", "Definir arquivo principal", "Conectar agente pelo painel"],
      commands: [{ label: "Health", command: "custom status" }],
      configs: [{ name: "registry.json", path: "~/.agents/registry.json", profile: "global", type: "json", content: "{\n  \"runtimes\": []\n}\n" }],
      instances: [],
    },
  ];
}

export function createDemoMissionControl(inputDate = new Date()) {
  const now = normalizeDemoDate(inputDate);
  const tick = Math.floor(now.getTime() / 8000);
  const base = cloneBase();
  const tokenValue = 290_000 + demoWave(tick, 16_000, 8_000, 3);
  const costValue = demoClamp(demoWave(tick, 6.2, 1.1, 9, 2), 2.8, 9.8);
  const activeTasks = demoClamp(demoWave(tick, 12, 4, 2), 5, 21);
  const runtimeHealthy = demoClamp(demoWave(tick, 9, 2, 5), 6, 12);

  return {
    ...base,
    demo: {
      enabled: true,
      mode: "connected-demo",
      generatedAt: now.toISOString(),
      tick,
    },
    status: {
      ...base.status,
      label: "Demo conectado",
      detail: `${runtimeHealthy} runtimes simulados · atualizacao viva`,
      updatedAt: now.toISOString(),
    },
    metrics: [
      { label: "tokens hoje", value: demoCompact(tokenValue), delta: `${demoWave(tick, 14, 6, 1)}% vs ontem`, hot: true },
      { label: "custo hoje", value: `$${costValue.toFixed(2)}`, delta: "-7% via roteamento" },
      { label: "tarefas ativas", value: String(activeTasks), delta: `${demoClamp(demoWave(tick, 5, 2, 4), 2, 8)} em coding loop` },
      { label: "runtimes hit", value: String(runtimeHealthy), delta: `${Math.max(0, runtimeHealthy - 2)} healthy · 2 riscos` },
    ],
    tokenSeries: {
      input: demoSeries(base.tokenSeries.input, tick, 11),
      output: demoSeries(base.tokenSeries.output, tick + 3, 9),
    },
    liveEvents: [
      { time: demoClock(now, 0), message: "demo atualizou runtimes e keys" },
      { time: demoClock(now, 2), message: "hermes sincronizou memoria do projeto" },
      { time: demoClock(now, 4), message: "codex validou contrato de agentes" },
      { time: demoClock(now, 6), message: "openclaw simulou gateway multi-canal" },
    ],
    activity: base.activity.map((item, index) => ({
      ...item,
      status: index === tick % base.activity.length ? "LIVE" : item.status,
    })),
    agentRuntimes: createDemoAgentRuntimes(tick),
    apiKeys: base.apiKeys.map((api, index) => ({
      ...api,
      latency: Math.max(60, api.latency + demoWave(tick, 0, 24, index)),
      usage: demoClamp(api.usage + demoWave(tick, 0, 8, index * 2), 0, 100),
      detail: index === 0 ? "Okami key pronta para agentes" : api.detail,
    })),
    hermes: {
      ...base.hermes,
      sshStatus: {
        status: "demo-live",
        latency: `${demoClamp(demoWave(tick, 146, 35, 7), 80, 260)}ms`,
        lastCheck: now.toISOString(),
      },
    },
    cliTools: base.cliTools.map((tool, index) => ({
      ...tool,
      agents: Math.max(1, tool.agents + ((tick + index) % 2)),
      lastRun: `${((tick + index) % 16) + 1} min`,
    })),
  };
}

export const mockMissionControl = createDemoMissionControl();
