# OKAMI Mission Control

Dashboard React + Vite para operar agentes Okami, custos, Kanban, sessões, logs, conexão SSH, Pixel Office e Okami API Keys com fluxo guiado.

[![License: MIT](https://img.shields.io/badge/License-MIT-cyan.svg)](LICENSE)
![Status](https://img.shields.io/badge/status-active-success)
![Stack](https://img.shields.io/badge/stack-React%2019%20%2B%20Vite%207%20%2B%20Phaser%204-orange)

Parte do projeto [OKAMI HQ](https://okami-site.msant262.workers.dev).

---

## Highlights

- **14 módulos visíveis**: Overview, Usage, Kanban, Office, Pixel, Perfis, Sessions, Cron, Agentes, Skills, Logs, Apps, CLIs e Docs.
- **Agentes unificado**: uma tela só para preparar o acesso do painel, configurar o SSH do servidor dos agentes e conectar agentes externos.
- **Key automática por agente**: o botão **Conectar agente** cria a Okami API Key, guarda o segredo no cofre e tenta aplicar `.okami.env` no workspace remoto.
- **Idiomas PT-BR e EN**: seletor no topo do painel, persistido no navegador, cobrindo navegação, status e cabeçalhos principais.
- **Tokens por período**: o Overview recalcula o card principal de tokens com o filtro ativo (`1h`, `24h`, `7d` ou `30d`) e mantém o total alinhado ao card lateral.
- **Fluxo simples por padrão**: o usuário não precisa editar arquivo manualmente para colar key; geração manual fica recolhida em **Avançado**.
- **Agentes suportados**: agente principal, OpenClaw, OpenHuman, Claude, Codex e externos como OpenCode/AutoGen/CrewAI/LangGraph.
- **Demo vivo**: sem servidor/token, a UI usa `createDemoMissionControl()` com dados variáveis e contrato completo, incluindo `agentRuntimes`.
- **SSE via same-origin**: em produção o frontend chama `/api` no mesmo domínio e o proxy injeta `OKAMI_BACKEND_PROXY_TOKEN`.
- **Polling autenticado direto**: quando `VITE_OKAMI_API_BASE_URL` aponta direto para a API, as chamadas usam `Authorization: Bearer <Okami API Key>`.
- **SSH dos agentes**: o servidor Node coleta dados reais via SSH (`state.db`, `kanban.db`, logs, sessões, skills e configs).
- **Storage endurecido**: `server/.data` usa permissões restritas; segredos SSH/API ficam cifrados e API Keys são armazenadas só como hash.
- **Pixel Office**: Phaser 4 + canvas transparente sobre `office.mp4`, com cleanup seguro em troca de abas.

---

## Quick Start

```bash
git clone https://github.com/OkamiOps/Okami-Monitor.git
cd Okami-Monitor
npm install
cp .env.example .env.local
npm run dev:all
```

Acesse `http://localhost:5173`.

Em desenvolvimento local, `npm run dev:all` já usa `/api` via proxy do Vite para `http://127.0.0.1:3001` e confia em chamadas de loopback. Você não precisa definir `VITE_OKAMI_API_BASE_URL` nem colar Okami API Key para operar o painel localmente.

Configuração opcional:

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

Abra `http://localhost:5173/#config` ou clique em **Agentes**. Para conectar o servidor, preencha host/user, escolha a chave privada SSH e clique **Conectar servidor**. O painel prepara o acesso local automaticamente; a área de keys fica recolhida em **Acesso e keys (avançado)** apenas para suporte/backup.

O idioma pode ser alternado no topo do painel entre **PT-BR** e **EN**. A preferência fica salva no `localStorage` em `okami.ui.language`.

Na mesma tela:

- **Servidor dos agentes** configura SSH do host onde os agentes rodam.
- **Agentes conectados** cria/vincula a key do agente automaticamente com **Conectar agente**.
- **Acesso e keys (avançado)** permite ver backups, colar key existente ou gerar uma key manual quando necessário.
- Se o SSH já estiver salvo, o servidor tenta escrever `.okami.env` no workspace do agente com `OKAMI_API_KEY`, `OKAMI_API_BASE_URL`, `OKAMI_AGENT_ID` e `OKAMI_AGENT_NAME`.
- Se o SSH ainda não estiver salvo, a key fica pronta no cofre e será aplicada quando a conexão SSH for configurada.

---

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Frontend Vite na porta 5173 |
| `npm run dev:api` | API Express na porta `OKAMI_API_PORT` ou 3001 |
| `npm run dev:all` | API + frontend em paralelo |
| `npm run build` | Build de produção em `dist/` |
| `npm run preview` | Preview do build |

---

## Arquitetura

```text
Okami-Monitor/
├── functions/api/[[path]].js     # Proxy same-origin Cloudflare Pages
├── src/
│   ├── App.jsx                   # SPA principal, 14 views visíveis e aba Agentes unificada
│   ├── PixelOfficeCanvas.jsx     # Pixel Office Phaser 4
│   ├── styles.css                # Design system e componentes
│   ├── components/
│   │   ├── Toast.jsx
│   │   └── MarkdownLite.jsx
│   ├── data/mockMissionControl.js # Demo vivo e schema base
│   └── lib/
│       ├── apiClient.js          # Auth, API client, Okami API Keys e conexão de agentes
│       └── useMissionControl.js  # SSE same-origin + polling fallback
├── server/
│   ├── index.js                  # Express API, auth, scopes, SSE e conexão automática de agentes
│   ├── hermesCollector.js        # Coleta dados dos agentes via SSH
│   ├── sshBridge.js              # ssh2 wrapper
│   └── store.js                  # Config, registry, secrets cifrados e auth hashes
└── public/                       # Video, sprites, favicon e assets pixel
```

Stack principal: React 19, Vite 7, Phaser 4, Express 5, ssh2 e Node ESM.

---

## Okami API Keys

O servidor aceita três formas de autenticação:

1. **Proxy interno**: `x-okami-proxy-token: <OKAMI_BACKEND_PROXY_TOKEN>` para Cloudflare Pages/functions.
2. **Token estático opcional**: `OKAMI_API_TOKEN` ou `VITE_OKAMI_API_TOKEN`.
3. **Okami API Key gerada**: `Authorization: Bearer okami_key_...`.

Rotas públicas:

- `GET /api/health`
- `GET /api/auth/status`
- `POST /api/auth/bootstrap` via loopback/proxy autorizado e apenas enquanto não houver key ativa

Rotas protegidas usam escopos:

- `read`: state, docs, apps e leitura operacional
- `write`: registry de apps/docs/agentes/APIs
- `ssh`: conexão SSH, comandos allowlist, arquivos permitidos e cron/timers
- `kanban`: criação de tasks
- `logs`: leitura de logs
- `admin`: criar/listar/revogar API Keys

As keys completas aparecem apenas no momento de criação. Depois disso o servidor guarda `tokenHash`, `tokenPrefix`, escopos, criação, último uso e revogação em `auth.json`.

---

## Agentes

A aba visível **Agentes** usa o hash `#config` por compatibilidade e substitui as antigas telas separadas de Config, Agentes e Hermes. Ela mostra:

- agentes padrão: agente principal, OpenClaw, OpenHuman, Claude Code, Codex e Outros agentes
- conexão de agente externo com identificador, nome, tipo, comando de teste, pasta, arquivo principal e workspace
- arquivos editáveis por agente
- instâncias associadas aos agentes reais ou demo
- comandos diagnósticos executáveis somente via allowlist

O servidor persiste agentes locais em `server/.data/registry.json` e, quando há SSH real, também lê `~/.agents/registry.json` no host remoto.

Ao clicar **Conectar agente**, a API executa `POST /api/mission-control/agent-runtimes/:id/connect`:

1. Normaliza o cadastro do agente.
2. Cria uma Okami API Key com os escopos recomendados.
3. Salva o segredo cifrado no cofre.
4. Registra no agente apenas prefixo, fingerprint, referência do segredo e status.
5. Tenta escrever `.okami.env` no workspace remoto via SSH.

Exemplo de agente externo:

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

## Conectar Servidor dos Agentes por SSH

1. Abra **Agentes**.
2. Em **Servidor dos agentes**, preencha host, user, porta, método de auth e a pasta base dos agentes.
3. Escolha a private key ou informe uma senha temporária.
4. Clique **Conectar servidor**. O painel prepara o acesso, salva a credencial no cofre, salva a configuração e testa o SSH na mesma ação.

Com SSH configurado, `collectHermesState()` troca o demo por dados reais e alimenta Overview, Usage, Office, Pixel, Kanban, Perfis, Skills, Logs, Sessions, CLIs e a seção Agentes.

Principais endpoints:

- `GET /api/mission-control/state`
- `GET /api/mission-control/stream`
- `PUT /api/mission-control/agent-runtimes/:id`
- `POST /api/mission-control/agent-runtimes/:id/connect`
- `POST /api/auth/keys`
- `POST /api/hermes/ssh/test`
- `POST /api/hermes/command`
- `POST /api/hermes/files/write`

---

## Segurança

- O Express remove `x-powered-by`.
- CORS permite origens configuradas em `OKAMI_ALLOWED_ORIGINS`; sem lista, dev/local continua simples.
- Em desenvolvimento local, requests vindos de loopback (`127.0.0.1`/`::1`) recebem acesso de painel para não travar usuários leigos; defina `OKAMI_TRUST_LOCAL_DEV=0` para desativar.
- `server/.data` é criado com `0700`, arquivos sensíveis com `0600`.
- Segredos salvos via `store.saveSecret()` usam AES-256-GCM.
- API Keys são validadas por hash SHA-256; o token completo não é persistido.
- Comandos remotos passam por allowlist fixa + comandos diagnósticos seguros dos agentes registrados.
- Escrita remota de arquivos só aceita paths em raízes de agentes permitidas.
- A escrita automática de `.okami.env` usa `chmod 600` e não retorna o segredo para o registro do agente.
- Cron/systemd rejeitam quebras de linha em campos de comando/calendário.

---

## Validação

Checklist local usado nesta mudança:

```bash
node --check server/index.js server/store.js server/hermesCollector.js src/data/mockMissionControl.js
npm run build
npm audit --json
```

Verificações adicionais do Overview/i18n:

- API local em `http://127.0.0.1:3001/api/mission-control/state` respondendo `200`.
- Playwright CLI em `http://127.0.0.1:5173` com filtros `1h`, `7d` e `30d`; o card principal **Tokens** acompanha o total do card de período.
- Alternância EN -> PT-BR validada no navegador; navegação, status, título do Overview e label de período mudam sem recarregar a página.

E2E realizado:

- bootstrap de Okami API Key
- key admin lendo state
- key read-only lendo state e falhando com 403 em escrita
- registro de runtime `opencode`
- bloqueio de comando inseguro
- bloqueio de escrita em `/etc/passwd`
- navegação por todas as 14 abas visíveis
- preparação do acesso principal pela UI
- conexão de agente externo pela UI com key automática
- edição de arquivo de agente pela UI
- Pixel canvas renderizado e não vazio
- console browser sem errors/warnings

---

## Design System

Tokens canônicos em `src/styles.css`:

- cores `--ok-bg-*`, `--ok-fg-*`, `--ok-orange`, `--ok-magenta`, `--ok-cyan`, `--ok-success`, `--ok-warning`, `--ok-danger`
- tipografia Space Grotesk + JetBrains Mono
- spacing `--ok-s-*`
- cantos retos por padrão
- componentes `.ok-btn-*`, `.ok-status-badge`, `.ok-filter-bar`, `.ok-toast`, `.ok-empty`, `.md-lite`

---

## License

MIT © OKAMI Ops.
