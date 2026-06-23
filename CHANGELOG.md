# Changelog

All notable changes to OKAMI Mission Control are documented here.

The project uses GitHub release tags. For SemVer compatibility in `package.json`, this beta is stored as `0.5.0-beta`; the public release tag is `v0.5-beta`.

## [0.5-beta] - 2026-06-23

### Overview

`0.5-beta` turns OKAMI Mission Control into a clearer operational dashboard for technical and non-technical users running multiple agent runtimes. The largest product change is the unified **Agents** flow: SSH server setup, connected agents, access preparation and Okami API Keys now live in one guided screen instead of competing across Config, Agents and Hermes concepts.

The release also makes English the primary product language, keeps PT-BR as a supported language option, removes Hermes-only wording from the main user-facing copy, fixes token metrics by period, expands real Kanban/SSH collection, hardens secrets and documents the complete beta workflow.

### Product and UX

- Renamed the main Overview heading from a Hermes-specific operation label to **Operation in real time**.
- Consolidated the previous Config/Agents/Hermes split into one visible **Agents** experience.
- Reorganized the visible dashboard into 14 modules: Overview, Usage, Kanban, Office, Pixel, Profiles, Sessions, Cron, Agents, Skills, Logs, Apps, CLIs and Docs.
- Made English the default UI language while preserving the top-bar PT-BR toggle.
- Reworked user-facing copy so the product describes a multi-agent operation, not only a Hermes deployment.
- Moved manual API Key generation out of the primary path and into the advanced access area.
- Added clearer states for demo/local mode, dashboard access, key readiness, key application, saved SSH config and connection failures.
- Improved Pixel Office canvas stability to avoid unnecessary visual remounts while switching views or refreshing state.
- Added the product favicon.

### Agents and Okami API Keys

- Added backend creation of Okami API Keys with `read`, `write`, `ssh`, `kanban`, `logs` and `admin` scopes.
- Full key values are shown only at creation time.
- The server stores only hashes, prefixes, scopes, creation time, last use and revocation state.
- Local development can bootstrap dashboard access without asking the user to paste a token manually.
- External agents can be registered with id, name, family/type, test command, base folder, entry file, workspace and recommended scopes.
- **Connect agent** now calls `POST /api/mission-control/agent-runtimes/:id/connect`, creates a key, stores the secret in the vault and registers only safe metadata on the runtime.
- When SSH is configured, the API tries to write `.okami.env` to the remote workspace with `OKAMI_API_KEY`, `OKAMI_API_BASE_URL`, `OKAMI_AGENT_ID` and `OKAMI_AGENT_NAME`.
- When SSH is not configured yet, the key remains prepared in the vault and can be applied later.

### Backend, SSH and Real Data

- Added support for internal proxy auth, optional static token auth and generated Okami API Key auth.
- Hardened `server/.data` permissions for local sensitive state.
- Added AES-256-GCM encryption for saved API and SSH secrets.
- Expanded the SSH collector to read `state.db`, `kanban.db`, sessions, logs, skills, configs and the agent registry.
- Made the collector more tolerant of schema variations and epoch/ISO timestamps.
- Added or expanded endpoints for auth status, bootstrap, key management, SSH testing, SSH config save, allowed command execution, allowed file writes and agent runtime connection.
- Kept same-origin `/api` support for Cloudflare Pages/functions deployments.
- Defaulted production frontend behavior toward same-origin `/api`, reducing manual `VITE_OKAMI_API_BASE_URL` setup.

### Security

- API Keys are verified through SHA-256 hashes and full tokens are never persisted.
- API and SSH secrets are encrypted in local server storage.
- Sensitive files are created with restricted permissions.
- Express removes `x-powered-by`.
- CORS respects `OKAMI_ALLOWED_ORIGINS` when configured.
- Loopback development access is trusted by default to reduce onboarding friction and can be disabled with `OKAMI_TRUST_LOCAL_DEV=0`.
- Remote file writes are limited to allowed agent roots.
- Automatic `.okami.env` writes use `chmod 600`.
- Remote command execution uses an allowlist plus registered diagnostic commands.
- Cron/systemd helpers reject line breaks in sensitive fields.

### Overview, Usage and Metrics

- Fixed the main **Tokens** card so it follows the active range filter.
- Fixed impossible comparisons where `7d` or `30d` could show fewer tokens than `24h` because of inconsistent buckets.
- Daily series now create continuous windows with empty days represented as zero.
- The side period card and the main token metric now use the same aggregation source.
- Live demo data now varies coherently instead of looking fixed.
- Usage labels, recommendations and dynamic status text now pass through the English translation layer.

### Kanban, Office and Pixel

- Kanban now aggregates detected boards instead of assuming only one default board.
- Added board selection and safer selection persistence when state changes.
- Kanban cards render real returned data when available.
- Task details show description, status, result, skills, comments, work log and run history with clearer empty states.
- Office and Pixel Office align agents with real tasks more consistently.
- The stray `agentops-triage-4` pixel entity no longer appears when it does not belong to the canonical Office agent list.
- Pixel Office preserves the canvas and layout while state changes, reducing visual refresh artifacts.

### Internationalization

- Added a top-bar language selector.
- Persisted the selected language in `localStorage` as `okami.ui.language`.
- Switched the default language to English.
- Preserved PT-BR as the alternate UI language.
- Covered navigation, headings, cards, forms, buttons, status, empty states, Apps, Docs, CLIs, Logs, Sessions, Skills, Cron, Agents, Office, Pixel, Kanban, Overview and Usage with the translation layer.
- Kept technical identifiers, endpoint names and file paths intact when they are part of the system contract.

### Documentation

- Rewrote the README as English-first documentation with a Portuguese section.
- Rewrote the changelog as English-first release history.
- Rewrote the `v0.5-beta` release notes as English-first GitHub release copy.
- Documented Quick Start, scripts, architecture, API Keys, scopes, Agents, SSH, security and validation.
- Clarified that the visible product is multi-agent even though some internal collector/endpoints still use legacy Hermes names.

### Validation

- `npm run build` passed.
- `git diff --check` passed.
- Browser navigation covered the visible product flow.
- Previously validated security flows include API Key bootstrap, admin key state read, read-only key write rejection, runtime connection, unsafe command rejection, blocked writes outside allowed roots and Pixel canvas rendering.

### Migration Notes

- Public release tag: `v0.5-beta`.
- Package version: `0.5.0-beta`.
- The visible **Agents** screen still uses `#config` internally for compatibility with old links.
- Old instructions that asked users to manually create and paste a key should move to **Connect agent**.
- Production deployments should prefer `VITE_OKAMI_API_BASE_URL=same-origin` plus `OKAMI_BACKEND_PROXY_TOKEN`.
- Real VPS/agent access requires SSH configuration in **Agents > Agent server** before automatic `.okami.env` writes can succeed.

## Portuguese Version

### Visao geral

O `0.5-beta` transforma o OKAMI Mission Control em um painel operacional mais claro para multiplos agentes. A principal mudanca e a unificacao da experiencia em **Agentes**: SSH do servidor, agentes conectados, acesso do painel e Okami API Keys ficam em uma unica tela guiada.

### Principais mudancas

- Ingles passou a ser o idioma padrao do produto.
- PT-BR continua disponivel pelo seletor de idioma.
- A copy principal deixou de tratar o monitor como uma operacao exclusiva do Hermes.
- A tela **Agentes** substitui a separacao antiga entre Config, Agentes e Hermes.
- **Conectar agente** cria/vincula Okami API Key automaticamente e tenta aplicar `.okami.env` via SSH.
- O card **Tokens** agora respeita `1h`, `24h`, `7d` e `30d` com agregacao coerente.
- Kanban, Office e Pixel foram ajustados para dados reais e multiplos agentes.
- Secrets e API Keys foram endurecidos com hash, criptografia e escopos.
- README, CHANGELOG e release notes foram reescritos em ingles com uma versao em portugues.

[0.5-beta]: https://github.com/OkamiOps/Okami-Monitor/releases/tag/v0.5-beta
