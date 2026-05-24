# OKAMI Mission Control

> **AI-ops cockpit, dark-mode terminal aesthetic.** Dashboard React + Vite para orquestrar agentes do Hermes Gateway com Pixel Office interativo, Kanban operacional, gestão de configs SSH e visibilidade de tokens/custos.

[![License: MIT](https://img.shields.io/badge/License-MIT-cyan.svg)](LICENSE)
![Status](https://img.shields.io/badge/status-active-success)
![Stack](https://img.shields.io/badge/stack-React%2019%20%2B%20Vite%207%20%2B%20Phaser%204-orange)

Parte do projeto [OKAMI HQ](https://okami-site.msant262.workers.dev) — operação técnica de IA, segurança e desenvolvimento para PMEs.

---

## ✨ Highlights

- **15 módulos** numerados estilo cockpit: Overview, Usage, Kanban, Office, Pixel, Perfis, Sessions, Cron, Config, Skills, Logs, Hermes, Apps, CLIs, Docs.
- **Pixel Office interativo** (Phaser 4 + Canvas) — agentes pixel-art andam, conversam e fazem reuniões em tempo real sobre vídeo de fundo `office.mp4`.
- **Design System v0.2.0 aplicado** — tokens OKLCH, tipografia Space Grotesk + JetBrains Mono, paleta heat orange / neon magenta / volt cyan, glow contido, cantos retos.
- **SSE ao vivo** (Server-Sent Events) — conexão persistente substitui o polling agressivo, sem refresh visual.
- **Hermes SSH bridge** — backend Node coleta dados reais da VPS (kanban.db, logs, sessões, métricas de tokens) via SSH.
- **Mock-first** — funciona 100% sem backend configurado pra preview/devs.
- **Markdown Lite render** — comentários/work logs com bullets, headers, code chips renderizados in-app.
- **Toast system** — feedback visual padronizado pra ações async.
- **Filter bars consistentes** — busca + selects + pills de severidade reutilizáveis.

---

## 🚀 Quick start

```bash
# 1. Clone
git clone https://github.com/OkamiOps/Okami-Monitor.git
cd Okami-Monitor

# 2. Instale deps
npm install

# 3. (Opcional) configure backend SSH — sem isso, roda em modo mock
cp .env.example .env.local
# edite .env.local com seu endpoint da VPS

# 4. Suba frontend + backend juntos
npm run dev:all
```

Acesse **http://localhost:5173**.

### Scripts disponíveis

| Comando | O que faz |
|---------|-----------|
| `npm run dev` | Frontend Vite (porta 5173, `--host 0.0.0.0`) |
| `npm run dev:api` | Backend Node Express (porta 3001) |
| `npm run dev:all` | Frontend + backend em paralelo |
| `npm run build` | Build de produção em `/dist` |
| `npm run preview` | Preview do build |

---

## 🎨 Design System

Tokens canônicos em `src/styles.css` (`:root`), alinhados com [OKAMI Design System v0.2.0](https://okami-site.msant262.workers.dev/design-system):

- **Cores**: `--ok-bg-0..3` (onyx scale), `--ok-fg/-soft/-mute/-dim` (foreground), `--ok-orange/-magenta/-cyan` (brand OKLCH L≈72), `--ok-success/-warning/-danger/-info` (functional)
- **Tipografia**: `--ok-fs-display` (88px) → `--ok-fs-caps` (11px) com tracking customizado
- **Spacing**: `--ok-s-1..12` base-4 (4/8/12/16/20/24/32/40/56/72/96/128)
- **Radius**: `--ok-r-0..3` + `--ok-r-pill` (default 0 — cantos retos)
- **Motion**: `--ok-ease: cubic-bezier(.2,.7,.2,1)` + durações fast/base/pulse/scan

**Utility classes**: `.ok-btn--{primary,outline,ghost,danger}`, `.ok-section-label`, `.ok-status-badge`, `.ok-terminal`, `.ok-toast`, `.ok-empty`, `.ok-skeleton`, `.ok-filter-bar`, `.md-lite`.

---

## 🏗️ Arquitetura

```
Okami-Monitor/
├── src/
│   ├── App.jsx                   # SPA principal — 15 views + navegação
│   ├── PixelOfficeCanvas.jsx     # Pixel Office (Phaser 4 + vídeo)
│   ├── styles.css                # Design System + componentes (11k+ linhas)
│   ├── components/
│   │   ├── Toast.jsx             # Sistema de toasts (provider + hook)
│   │   └── MarkdownLite.jsx      # Render markdown leve sem deps
│   ├── lib/
│   │   ├── useMissionControl.js  # SSE + polling fallback
│   │   └── apiClient.js          # HTTP client
│   ├── data/
│   │   └── mockMissionControl.js # Dados mock (sem backend)
│   └── main.jsx                  # Bootstrap
├── server/
│   ├── index.js                  # Express API + SSE stream
│   ├── sshBridge.js              # ssh2 wrapper (kanban.db, logs, sessões)
│   ├── hermesCollector.js        # Coleta + normaliza dados Hermes
│   └── store.js                  # Vault local de configs SSH
└── public/                       # Sprites, vídeo office.mp4, assets pixel
```

### Stack

- **React 19** + **Vite 7** (build/dev)
- **Phaser 4.1** (canvas pixel office)
- **Recharts** (charts no Overview/Usage)
- **Express 5** + **ssh2** (backend SSH bridge)
- **Node ≥18** (ESM nativo)

### Por que SSE em vez de polling

A conexão ao vivo persistente:
- Evita "refresh visual" quando os dados mudam (canvas Phaser não re-monta)
- Servidor empurra `event: state` só quando há diff real
- Heartbeats a cada 25s mantêm a conexão alive
- Fallback automático pra polling 8s se SSE falhar

---

## 🔌 Conectar a VPS real (Hermes SSH)

1. Copie o `.env.example` pra `.env.local` e ajuste:

```env
VITE_OKAMI_API_BASE_URL=http://localhost:3001
VITE_OKAMI_API_TOKEN=token-opcional-bearer
OKAMI_API_PORT=3001
OKAMI_STREAM_INTERVAL_MS=8000
```

2. Abra a tela **Hermes** no app e preencha:
   - SSH host, user, port
   - Auth method (SSH key recomendado, password como fallback)
   - Upload da private key (`id_ed25519`, `id_rsa`, `.pem` — nunca `.pub`)
   - Hermes home path (default `~/.hermes/`)

3. Clique **Salvar perfil** + **Testar SSH**. O backend persiste em `server/.data/secrets.json` (gitignored).

4. Os dados reais começam a fluir no Overview, Kanban, Sessions, Logs.

### Formato da API esperado

`GET /api/mission-control/state` deve retornar JSON com:

```json
{
  "status": { "label": "Hermes online", "healthy": true },
  "metrics": [{ "label": "tokens hoje", "value": "304.3k", "delta": "+18%" }],
  "models": [{ "name": "gpt-5.4", "share": 10 }],
  "activity": [{ "actor": "Hermes", "message": "...", "status": "OK" }],
  "agents": [{ "id": "morgana", "name": "Morgana", "color": "magenta", "status": "active", "currentTask": "...", "subagents": [], "workEvents": [], "monitorLines": [] }],
  "kanban": { "Backlog": [{ "title": "..." }] },
  "subscriptions": [{ "id": "openai", "name": "OpenAI", "monthlyCost": 200, "action": "monitorar" }],
  "hermes": { "sessions": [], "logLines": [], "profileDocs": [], "skillDocs": [], "configFiles": [] }
}
```

`GET /api/mission-control/stream` (SSE) emite `event: state` e `event: heartbeat`.

Veja `src/data/mockMissionControl.js` pra schema completo.

---

## 🎮 Pixel Office

Demo interativa em Phaser 4:

- **6 agentes** (Astride, Zelda, Diana, Morgana, Persefone, Leona) sentam nas mesas + andam em break cycles
- **40s de reunião** sincronizada na sala de meeting (uma vez por dia)
- **Diálogos contextuais** (200+ falas em 12 pools) — tech, sprint, casual, café, zen, boardroom
- **Animações sprites direcionais** (RPG Top Down Pack)
- **Background = vídeo `office.mp4`** sobreposto a canvas Phaser transparente
- **Pathfinding em L** (movimento ortogonal) respeitando paredes do escritório

Click no agente abre modal com: status, profile, current task, processamento (eventos de tool use), monitor `state.db`, subagentes e tarefas vinculadas.

---

## 🤝 Contribuir

Issues e PRs são bem-vindos. Antes de abrir:

1. Rode `npm run build` localmente — não pode quebrar.
2. Siga os tokens do Design System (`--ok-*`) em vez de hardcodes.
3. Componentes novos com cores devem usar `nth-child(4n+1/2/3)` rotation entre `--ok-orange/-cyan/-magenta/-success`.
4. Acessibilidade: focus visible com cyan ring 3px (`:focus-visible`).

### Convenções

- **Cantos retos** por padrão (`--ok-r-0`). Pill só em badges arredondados.
- **Mono caps** (`.ok-caps`) pra labels, eyebrows, status — `+0.18em tracking uppercase`.
- **Display Space Grotesk** pra titles com tracking negativo (`-0.02em..-0.04em`).
- **Glow contido** — `var(--ok-glow-px)` (24px × intensidade) com `color-mix` accent.

---

## 📜 License

MIT © OKAMI Ops · [okamiops.com](https://okami-site.msant262.workers.dev)

Open source pra que outras operações técnicas possam orquestrar agentes IA com soberania de dados e visibilidade real.
