# OKAMI Mission Control

React + Vite dashboard for operating multi-agent environments, usage, Kanban, sessions, logs, SSH access, Pixel Office and Okami API Keys through a guided workflow.

[![License: MIT](https://img.shields.io/badge/License-MIT-cyan.svg)](LICENSE)
![Status](https://img.shields.io/badge/status-active-success)
![Stack](https://img.shields.io/badge/stack-React%2019%20%2B%20Vite%207%20%2B%20Phaser%204-orange)

Part of [OKAMI HQ](https://okami-site.msant262.workers.dev).

---

## Highlights

- **Multi-agent cockpit**: the product copy is no longer tied to a single Hermes-only flow. The main command deck is now **Operation in real time**.
- **14 visible modules**: Overview, Usage, Kanban, Office, Pixel, Profiles, Sessions, Cron, Agents, Skills, Logs, Apps, CLIs and Docs.
- **Unified Agents screen**: one place to prepare dashboard access, configure the agent server SSH connection and connect external agents.
- **Automatic agent keys**: **Connect agent** creates an Okami API Key, stores the secret in the encrypted server vault and tries to apply `.okami.env` to the remote workspace.
- **English-first UI with PT-BR support**: the dashboard defaults to English and keeps a language switcher for Portuguese.
- **Period-aware tokens**: Overview recalculates token totals for `1h`, `24h`, `7d` and `30d` with one consistent aggregation source.
- **Simpler default flow**: users do not need to manually generate, copy and paste API Keys. Manual key tools are kept under advanced access.
- **Supported agent runtimes**: main agent, OpenClaw, OpenHuman, Claude Code, Codex and external runtimes such as OpenCode, AutoGen, CrewAI and LangGraph.
- **Live demo mode**: without a server or token, `createDemoMissionControl()` provides variable demo data and the full UI contract.
- **Same-origin API support**: in production, the frontend can call `/api` on the same domain while the proxy injects `OKAMI_BACKEND_PROXY_TOKEN`.
- **Direct authenticated polling**: when `VITE_OKAMI_API_BASE_URL` points directly to the API, requests use `Authorization: Bearer <Okami API Key>`.
- **Agent server over SSH**: the Node server collects real state through SSH, including `state.db`, `kanban.db`, logs, sessions, skills and config files.
- **Hardened local storage**: `server/.data` uses restricted permissions; SSH/API secrets are encrypted and API Keys are stored only as hashes.
- **Pixel Office**: Phaser 4 renders the pixel office canvas with stable cleanup when switching views.

---

## Quick Start

```bash
git clone https://github.com/OkamiOps/Okami-Monitor.git
cd Okami-Monitor
npm install
cp .env.example .env.local
npm run dev:all
```

Open `http://localhost:5173`.

For local development, `npm run dev:all` starts the Express API and the Vite frontend. Vite proxies `/api` to `http://127.0.0.1:3001`, and loopback requests are trusted by default so non-technical users can test the dashboard without manually pasting an Okami API Key.

Optional configuration:

```env
VITE_OKAMI_API_BASE_URL=same-origin
VITE_OKAMI_API_TOKEN=
VITE_OKAMI_POLL_INTERVAL_MS=8000

OKAMI_API_PORT=3001
OKAMI_API_TOKEN=
OKAMI_DATA_DIR=server/.data
OKAMI_TRUST_LOCAL_DEV=1
OKAMI_STREAM_INTERVAL_MS=8000
OKAMI_ALLOWED_ORIGINS=
OKAMI_BACKEND_URL=
OKAMI_BACKEND_PROXY_TOKEN=
```

Open `http://localhost:5173/#config` or click **Agents**. To connect the server, fill in host/user, choose the SSH authentication method and click **Connect server**. The dashboard prepares local access automatically; manual key tools remain under **Access and keys (advanced)** for support and backup only.

The language switcher in the top bar supports **EN** and **PT-BR**. The preference is stored in `localStorage` under `okami.ui.language`.

---

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite frontend on port 5173 |
| `npm run dev:api` | Express API on `OKAMI_API_PORT` or 3001 |
| `npm run dev:all` | API and frontend together |
| `npm run build` | Production build in `dist/` |
| `npm run preview` | Preview the production build |

---

## Architecture

```text
Okami-Monitor/
├── functions/api/[[path]].js      # Cloudflare Pages same-origin proxy
├── src/
│   ├── App.jsx                    # Main SPA, 14 views and unified Agents flow
│   ├── PixelOfficeCanvas.jsx      # Phaser 4 Pixel Office
│   ├── styles.css                 # Design system and components
│   ├── components/
│   │   ├── Toast.jsx
│   │   └── MarkdownLite.jsx
│   ├── data/mockMissionControl.js # Live demo data and base schema
│   └── lib/
│       ├── apiClient.js           # Auth, API client, Okami API Keys and agent connection
│       └── useMissionControl.js   # Same-origin SSE plus polling fallback
├── server/
│   ├── index.js                   # Express API, auth, scopes, SSE and agent connection
│   ├── hermesCollector.js         # Real agent data collection over SSH
│   ├── sshBridge.js               # ssh2 wrapper
│   └── store.js                   # Config, registry, encrypted secrets and auth hashes
└── public/                        # Video, sprites, favicon and pixel assets
```

Main stack: React 19, Vite 7, Phaser 4, Express 5, ssh2 and Node ESM.

The `hermesCollector.js` name is still the internal collector contract. User-facing copy now describes the monitored environment as an agent operation, not a Hermes-only product surface.

---

## Okami API Keys

The server supports three authentication paths:

1. **Internal proxy**: `x-okami-proxy-token: <OKAMI_BACKEND_PROXY_TOKEN>` for Cloudflare Pages/functions.
2. **Optional static token**: `OKAMI_API_TOKEN` or `VITE_OKAMI_API_TOKEN`.
3. **Generated Okami API Key**: `Authorization: Bearer okami_key_...`.

Public routes:

- `GET /api/health`
- `GET /api/auth/status`
- `POST /api/auth/bootstrap`, allowed through loopback or the authorized proxy while no active key exists

Protected scopes:

- `read`: state, docs, apps and operational read access
- `write`: apps, docs, agents and API registry writes
- `ssh`: SSH connection, command allowlist, allowed file writes and cron/timers
- `kanban`: task creation
- `logs`: log reads
- `admin`: create, list and revoke API Keys

Full key values are shown only at creation time. After that, the server stores `tokenHash`, `tokenPrefix`, scopes, creation time, last use and revocation state in `auth.json`.

---

## Agents

The visible **Agents** screen uses the `#config` hash for backward compatibility and replaces the older split between Config, Agents and Hermes. It contains:

- default runtimes: main agent, OpenClaw, OpenHuman, Claude Code, Codex and Other agents
- external agent connection with identifier, name, type, test command, base folder, entry file and workspace
- editable files per agent
- instances associated with real or demo agents
- diagnostic commands executed only through an allowlist
- dashboard access, server SSH setup and advanced key support

The server persists local agents in `server/.data/registry.json`. When real SSH is configured, it also reads `~/.agents/registry.json` on the remote host.

When the user clicks **Connect agent**, the API calls `POST /api/mission-control/agent-runtimes/:id/connect`:

1. Normalize the runtime registration.
2. Create an Okami API Key with the recommended scopes.
3. Store the secret in the encrypted vault.
4. Register only the prefix, fingerprint, secret reference and status on the runtime.
5. Try to write `.okami.env` to the remote workspace over SSH.

Example external agent:

```json
{
  "id": "opencode",
  "name": "OpenCode",
  "family": "coding-cli",
  "command": "opencode status",
  "home": "~/.agents/workspaces/opencode",
  "configPath": "~/.agents/registry.json",
  "workspacePath": "~/.agents/workspaces/opencode",
  "recommendedScopes": ["read"]
}
```

---

## Agent Server SSH

1. Open **Agents**.
2. In **Agent server**, fill in host, user, port, authentication method and the base folder used by the agents.
3. Choose a private key or enter a temporary SSH password.
4. Click **Connect server**. The dashboard prepares access, saves the credential in the vault, saves the config and tests SSH in one action.

With SSH configured, `collectHermesState()` replaces demo data with real state and feeds Overview, Usage, Office, Pixel, Kanban, Profiles, Skills, Logs, Sessions, CLIs and Agents.

Main endpoints:

- `GET /api/mission-control/state`
- `GET /api/mission-control/stream`
- `PUT /api/mission-control/agent-runtimes/:id`
- `POST /api/mission-control/agent-runtimes/:id/connect`
- `POST /api/auth/keys`
- `POST /api/hermes/ssh/test`
- `POST /api/hermes/command`
- `POST /api/hermes/files/write`

---

## Security

- Express disables `x-powered-by`.
- CORS uses `OKAMI_ALLOWED_ORIGINS` when configured; without a list, local development stays simple.
- In local development, loopback requests receive dashboard access by default. Set `OKAMI_TRUST_LOCAL_DEV=0` to disable this.
- `server/.data` is created with `0700`; sensitive files use `0600`.
- Secrets saved through `store.saveSecret()` use AES-256-GCM.
- API Keys are validated through SHA-256 hashes; full tokens are never persisted.
- Remote commands pass through a fixed allowlist plus registered safe diagnostic commands.
- Remote file writes are limited to allowed agent roots.
- Automatic `.okami.env` writes use `chmod 600` and do not expose the secret in the agent registry.
- Cron/systemd helpers reject line breaks in sensitive command/calendar fields.

---

## Validation

Recommended local checks:

```bash
node --check server/index.js server/store.js server/hermesCollector.js src/data/mockMissionControl.js
npm run build
npm audit --json
git diff --check
```

Release validation covered:

- API state fetch through a generated/admin key.
- Read-only key allowed to read state and blocked with `403` on writes.
- Runtime registration and automatic agent key connection.
- Unsafe remote command blocked.
- File write outside allowed paths blocked.
- Navigation through all 14 visible modules.
- Main access preparation through the UI.
- External agent connection through the UI with automatic key creation.
- Agent file editing through the UI.
- Pixel canvas rendered and non-empty.
- Browser console checked without relevant application errors.
- Overview token filters `1h`, `24h`, `7d` and `30d` aligned with the main token card.

---

## Design System

Canonical tokens live in `src/styles.css`:

- colors: `--ok-bg-*`, `--ok-fg-*`, `--ok-orange`, `--ok-magenta`, `--ok-cyan`, `--ok-success`, `--ok-warning`, `--ok-danger`
- typography: Space Grotesk and JetBrains Mono
- spacing: `--ok-s-*`
- sharp corners by default
- components: `.ok-btn-*`, `.ok-status-badge`, `.ok-filter-bar`, `.ok-toast`, `.ok-empty`, `.md-lite`

---

## Portuguese Version

O OKAMI Mission Control e um dashboard React + Vite para operar ambientes multiagentes, custos, Kanban, sessoes, logs, SSH, Pixel Office e Okami API Keys.

Nesta beta, a experiencia principal deixa de ser centrada em Hermes como produto e passa a representar a operacao de agentes de forma mais ampla. A tela **Agentes** concentra acesso do painel, conexao SSH do servidor, conexao de agentes externos, arquivos, instancias e suporte avancado a keys.

Fluxo principal:

1. Rode `npm install`, copie `.env.example` para `.env.local` e execute `npm run dev:all`.
2. Abra `http://localhost:5173`.
3. Clique em **Agentes**.
4. Configure o servidor dos agentes por SSH.
5. Use **Conectar agente** para criar/vincular a Okami API Key automaticamente.

O idioma padrao do produto e ingles, mas o seletor no topo permite alternar para **PT-BR**. A preferencia fica salva em `okami.ui.language`.

---

## License

MIT © OKAMI Ops.
