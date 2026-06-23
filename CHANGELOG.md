# Changelog

Todas as mudanças importantes do OKAMI Mission Control serão documentadas aqui.

O projeto usa tags de release no GitHub. Para compatibilidade com SemVer em `package.json`, a versão interna desta entrega é `0.5.0-beta`; o release público solicitado é `0.5-beta`.

## [0.5-beta] - 2026-06-23

### Visão Geral

O `0.5-beta` é a primeira entrega beta focada em transformar o OKAMI Mission Control em um painel operacional mais claro para usuários técnicos e não técnicos. A mudança principal é a consolidação do fluxo de agentes: o usuário agora encontra servidor SSH, agentes conectados e API Keys em uma única tela chamada **Agentes**, com uma jornada guiada para conectar agentes sem pedir edição manual de arquivos.

Esta versão também corrige o comportamento de métricas de tokens no Overview, amplia a coleta real do Kanban/Hermes, reforça autenticação e storage de segredos, adiciona suporte prático para PT-BR e EN, e documenta o fluxo completo no README.

### Produto e UX

- A antiga separação entre Config, Agentes e Hermes foi consolidada em uma experiência única na aba **Agentes**.
- A navegação visível foi reorganizada para 14 módulos: Overview, Usage, Kanban, Office, Pixel, Perfis, Sessions, Cron, Agentes, Skills, Logs, Apps, CLIs e Docs.
- O fluxo padrão agora orienta usuários leigos: primeiro conectar servidor, depois conectar agentes, deixando geração manual de key apenas na área avançada.
- O botão **Conectar agente** cria/vincula a Okami API Key automaticamente e tenta preparar o arquivo `.okami.env` no workspace remoto.
- A tela de Agentes mostra agentes padrão, agentes externos, arquivos editáveis, instâncias, capacidades, permissões, pendências e comandos permitidos.
- A área avançada de acesso foi mantida como suporte/backup, mas saiu do caminho principal do usuário.
- O painel mostra estados mais claros para demo/local, acesso do painel, key pronta, key aplicada, SSH salvo e falhas de conexão.
- O Pixel Office ganhou estabilidade de canvas para evitar remount/refresh visual desnecessário ao trocar dados ou abas.
- O favicon do produto foi adicionado.

### Okami API Keys e Conexão de Agentes

- Adicionada criação de Okami API Keys pelo backend com escopos `read`, `write`, `ssh`, `kanban`, `logs` e `admin`.
- As keys completas aparecem somente no momento de criação.
- O servidor persiste apenas hash, prefixo, escopos, criação, último uso e estado de revogação.
- O painel consegue fazer bootstrap de acesso local em desenvolvimento sem exigir token manual.
- Agentes externos podem ser cadastrados com id, nome, família/tipo, comando de teste, pasta, arquivo principal, workspace e escopos recomendados.
- A conexão de agente executa `POST /api/mission-control/agent-runtimes/:id/connect`, cria a key, salva o segredo no cofre e registra apenas metadados seguros no runtime.
- Quando o SSH do servidor está configurado, a API tenta escrever `.okami.env` no workspace do agente com `OKAMI_API_KEY`, `OKAMI_API_BASE_URL`, `OKAMI_AGENT_ID` e `OKAMI_AGENT_NAME`.
- Quando o SSH ainda não está configurado, a key fica preparada no cofre e pode ser aplicada depois.

### Backend, SSH e Dados Reais

- O backend Express passou a tratar autenticação por proxy interno, token estático opcional e Okami API Key gerada.
- `server/.data` recebeu endurecimento de permissões para dados sensíveis.
- Segredos são salvos com criptografia AES-256-GCM via store local.
- O coletor Hermes foi ampliado para ler `state.db`, `kanban.db`, sessões, logs, skills, configs e registry de agentes.
- O Kanban agora agrega boards do Hermes em vez de depender somente do board/default db.
- O collector ficou mais tolerante a variações de schema e timestamps em epoch ou ISO.
- A API passou a oferecer endpoints para criar/listar/revogar keys, testar SSH, salvar configuração SSH, executar comandos permitidos, escrever arquivos autorizados e conectar runtimes de agentes.
- A camada same-origin `/api` continua suportada para produção via Cloudflare Pages/functions.
- Em produção, o frontend usa `/api` no mesmo domínio por padrão, evitando configuração manual de `VITE_OKAMI_API_BASE_URL`.

### Segurança

- API Keys são validadas por hash SHA-256, sem persistir token completo.
- Segredos de API e SSH ficam cifrados no storage local do servidor.
- Arquivos sensíveis são criados com permissões restritas.
- O servidor remove `x-powered-by`.
- CORS respeita `OKAMI_ALLOWED_ORIGINS` quando configurado.
- Desenvolvimento local por loopback pode ser confiável por padrão para não bloquear testes de usuários iniciantes, com opção de desativar via `OKAMI_TRUST_LOCAL_DEV=0`.
- Escrita remota de arquivos é limitada a raízes permitidas dos agentes.
- A escrita automática de `.okami.env` usa `chmod 600`.
- Execução remota usa allowlist e comandos diagnósticos registrados.
- Cron/systemd rejeitam quebras de linha em campos sensíveis.

### Overview, Usage e Métricas

- Corrigido o card principal **Tokens** para acompanhar o filtro ativo (`1h`, `24h`, `7d`, `30d`).
- Corrigido o problema em que 7 dias ou 30 dias podiam aparecer com menos tokens que 24 horas por inconsistência de bucket.
- A série temporal diária agora cria janelas contínuas com dias sem dados zerados, evitando comparações impossíveis entre períodos.
- O card lateral de período e o card principal de tokens usam a mesma fonte agregada.
- O demo vivo varia dados de forma coerente, reduzindo a impressão de números fixos.
- O Usage ganhou textos, labels e recomendações traduzíveis para EN.

### Kanban, Office e Pixel

- O Kanban exibe boards distintos detectados nas tasks e mantém uma seleção válida quando os dados mudam.
- Cards do Kanban passaram a renderizar dados reais retornados pelo Hermes quando disponíveis.
- O detalhe de task mostra descrição, resultado, skills, comentários, work log e run history com estados vazios mais claros.
- O Office e o Pixel Office alinham agentes com tasks reais de forma mais consistente.
- O agente `agentops-triage-4` deixou de aparecer como entidade solta quando não pertence à lista canônica do Office.
- O Pixel Office preserva canvas e layout quando os dados do estado mudam, evitando recriação visual agressiva.

### Internacionalização PT-BR e EN

- Adicionado seletor de idioma no topo do painel.
- A preferência fica persistida no `localStorage` em `okami.ui.language`.
- A navegação, cabeçalhos, cards, status, empty states, botões, forms e descrições principais foram cobertos por PT-BR/EN.
- Overview, Usage, Kanban, Office, Pixel, Profiles, Sessions, Cron, Agents, Skills, Logs, Apps, CLIs e Docs foram varridos em EN.
- Textos vindos de mocks, estados locais e status dinâmicos passam por uma camada de tradução.
- Valores técnicos e identificadores permanecem preservados quando não são conteúdo de UI.

### Documentação

- README reescrito para refletir o novo fluxo de Agentes.
- Documentado o Quick Start com `npm run dev:all`.
- Documentado o uso local sem necessidade de colar Okami API Key.
- Documentados endpoints principais, escopos, segurança, conexão SSH, API Keys, fluxo de agentes e validações.
- Adicionado este `CHANGELOG.md` com explicação detalhada da versão beta.
- Adicionado arquivo de notas de release em `docs/releases/v0.5-beta.md`.

### Validação

- `npm run build` validado com sucesso.
- `git diff --check` validado sem problemas.
- Playwright percorreu as 14 abas em EN e a varredura de termos portugueses suspeitos retornou vazia.
- Console do navegador verificado sem erros ou warnings relevantes de aplicação.
- Fluxos previamente validados incluem bootstrap de key, leitura com key admin, bloqueio 403 para key sem escopo, conexão de runtime, bloqueio de comando inseguro, bloqueio de escrita fora de path permitido, navegação pelas abas e renderização do Pixel canvas.

### Notas de Migração

- O release público é `v0.5-beta`; o `package.json` usa `0.5.0-beta` para respeitar SemVer.
- A aba visível **Agentes** continua usando `#config` internamente por compatibilidade com links antigos.
- Quem tinha instruções antigas para editar arquivo manualmente e colar key deve migrar para o botão **Conectar agente**.
- Em produção, prefira `VITE_OKAMI_API_BASE_URL=same-origin` e configure o proxy/backend com `OKAMI_BACKEND_PROXY_TOKEN`.
- Para conexão real com VPS, configure SSH em **Agentes > Servidor dos agentes** antes de esperar escrita automática de `.okami.env`.

[0.5-beta]: https://github.com/OkamiOps/Okami-Monitor/releases/tag/v0.5-beta
