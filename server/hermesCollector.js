import { mockMissionControl } from "../src/data/mockMissionControl.js";
import { sshExec } from "./sshBridge.js";

function redact(value = "") {
  return value
    .replace(/(sk-[A-Za-z0-9_-]{8,})/g, "sk-***")
    .replace(/(ghp_[A-Za-z0-9_]{8,})/g, "ghp_***")
    .replace(/(api[_-]?key\s*[:=]\s*)[^\s]+/gi, "$1***")
    .slice(0, 12000);
}

function redactDeep(value) {
  if (typeof value === "string") return redact(value);
  if (Array.isArray(value)) return value.map((item) => redactDeep(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redactDeep(item)]));
  }
  return value;
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function shellPath(value) {
  const raw = String(value || "");
  if (raw === "~" || raw.startsWith("~/")) return `$HOME${raw.slice(1)}`;
  return shellQuote(raw);
}

async function tryExec(config, store, command, fallback = "") {
  try {
    const result = await sshExec(config, store, command, { timeoutMs: 15000 });
    return result.exitCode === 0 ? result.stdout.trim() : fallback;
  } catch {
    return fallback;
  }
}

function compactNumber(value) {
  const number = Number(value) || 0;
  if (number >= 1_000_000_000) return `${(number / 1_000_000_000).toFixed(1)}B`;
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M`;
  if (number >= 1_000) return `${(number / 1_000).toFixed(1)}k`;
  return String(number);
}

function compactTokens(value) {
  return `${compactNumber(value)} tokens`;
}

function totalSessionTokens(session) {
  return Number(session.input_tokens || 0)
    + Number(session.output_tokens || 0)
    + Number(session.cache_read_tokens || 0)
    + Number(session.cache_write_tokens || 0)
    + Number(session.reasoning_tokens || 0);
}

function mergeByKey(items, key, valueFields) {
  const merged = new Map();
  items.forEach((item) => {
    const id = item[key] ?? "unknown";
    const current = merged.get(id) ?? { [key]: id };
    valueFields.forEach((field) => {
      current[field] = Number(current[field] || 0) + Number(item[field] || 0);
    });
    merged.set(id, current);
  });
  return [...merged.values()];
}

function parseJson(raw, fallback = null) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function collectAnalytics(config, store) {
  const hermesHome = config.hermesHome || "~/.hermes";
  const command = String.raw`python3 - <<'PY'
import glob, json, os, sqlite3, time

def connect(path):
    con = sqlite3.connect(path)
    con.row_factory = sqlite3.Row
    return con

def token_expr():
    return "coalesce(input_tokens,0)+coalesce(output_tokens,0)+coalesce(cache_read_tokens,0)+coalesce(cache_write_tokens,0)+coalesce(reasoning_tokens,0)"

def safe_rows(cur, sql, args=()):
    try:
        return [dict(r) for r in cur.execute(sql, args)]
    except Exception:
        return []

base = os.path.expanduser(${pythonString(hermesHome)})
dbs = [(os.path.join(base, 'state.db'), 'default')]
for db in sorted(glob.glob(os.path.join(base, 'profiles', '*', 'state.db'))):
    dbs.append((db, db.split('/profiles/')[1].split('/')[0]))

profiles = []
recent = []
events = []
models = []
model_days = {}
platforms = []
days = {}
hours = {}
tools = {}

for db, profile in dbs:
    if not os.path.exists(db):
        continue
    con = connect(db)
    cur = con.cursor()
    # Guardado: se o schema da tabela sessions divergir, nao derruba todo o
    # analytics — zera o profile e segue (models/days/hours usam safe_rows).
    agg_rows = safe_rows(cur, f"""
        select count(*) sessions,
               coalesce(sum(message_count),0) messages,
               coalesce(sum(tool_call_count),0) tool_calls,
               coalesce(sum(input_tokens),0) input_tokens,
               coalesce(sum(output_tokens),0) output_tokens,
               coalesce(sum(cache_read_tokens),0) cache_read_tokens,
               coalesce(sum(cache_write_tokens),0) cache_write_tokens,
               coalesce(sum(reasoning_tokens),0) reasoning_tokens,
               coalesce(sum({token_expr()}),0) tokens,
               sum(case when ended_at is null then 1 else 0 end) active_sessions
        from sessions
    """)
    profile_row = dict(agg_rows[0]) if agg_rows else {}
    for key in ['sessions', 'messages', 'tool_calls', 'input_tokens', 'output_tokens',
                'cache_read_tokens', 'cache_write_tokens', 'reasoning_tokens', 'tokens', 'active_sessions']:
        profile_row.setdefault(key, 0)
    profile_row['profile'] = profile
    profiles.append(profile_row)

    for row in safe_rows(cur, f"""
        select coalesce(model,'unknown') name,
               count(*) sessions,
               coalesce(sum({token_expr()}),0) tokens
        from sessions
        group by coalesce(model,'unknown')
        order by tokens desc
        limit 20
    """):
        row['profile'] = profile
        models.append(row)

    for row in safe_rows(cur, f"""
        select coalesce(model,'unknown') name,
               strftime('%Y-%m-%d', datetime(started_at, 'unixepoch')) bucket,
               coalesce(sum({token_expr()}),0) tokens,
               count(*) sessions
        from sessions
        group by coalesce(model,'unknown'), bucket
        order by bucket asc
    """):
        name = row['name'] or 'unknown'
        bucket = row['bucket'] or 'unknown'
        current = model_days.setdefault(name, {}).setdefault(bucket, {'bucket': bucket, 'tokens': 0, 'sessions': 0})
        current['tokens'] += row['tokens'] or 0
        current['sessions'] += row['sessions'] or 0

    for row in safe_rows(cur, f"""
        select coalesce(source,'unknown') source,
               count(*) sessions,
               coalesce(sum(message_count),0) messages,
               coalesce(sum({token_expr()}),0) tokens
        from sessions
        group by coalesce(source,'unknown')
        order by tokens desc
        limit 20
    """):
        row['profile'] = profile
        platforms.append(row)

    for row in safe_rows(cur, f"""
        select id, source, model, started_at, ended_at, message_count, tool_call_count,
               input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, reasoning_tokens,
               estimated_cost_usd, actual_cost_usd, title
        from sessions
        order by coalesce(ended_at, started_at) desc
        limit 8
    """):
        row['profile'] = profile
        recent.append(row)

    message_cols = [r['name'] for r in safe_rows(cur, "pragma table_info(messages)")]
    if message_cols:
        def pick(*names):
            for name in names:
                if name in message_cols:
                    return name
            return None
        id_col = pick('id', 'message_id')
        session_col = pick('session_id', 'session', 'conversation_id')
        role_col = pick('role', 'type', 'kind')
        content_col = pick('content', 'text', 'message', 'body')
        tool_col = pick('tool_name', 'tool', 'function_name', 'name')
        created_col = pick('created_at', 'timestamp', 'time', 'ts')
        selected = []
        aliases = []
        for alias, col in [('id', id_col), ('session_id', session_col), ('role', role_col), ('content', content_col), ('tool_name', tool_col), ('created_at', created_col)]:
            if col:
                selected.append(f"{col} as {alias}")
                aliases.append(alias)
        if selected:
            order = created_col or id_col or message_cols[0]
            for row in safe_rows(cur, f"select {', '.join(selected)} from messages order by {order} desc limit 24"):
                row['profile'] = profile
                events.append(row)

    for row in safe_rows(cur, f"""
        select strftime('%Y-%m-%d', datetime(started_at, 'unixepoch')) bucket,
               coalesce(sum(input_tokens),0) input_tokens,
               coalesce(sum(output_tokens),0) output_tokens,
               coalesce(sum({token_expr()}),0) tokens,
               count(*) sessions
        from sessions
        group by bucket
        order by bucket asc
    """):
        bucket = row['bucket'] or 'unknown'
        current = days.setdefault(bucket, {'bucket': bucket, 'input_tokens': 0, 'output_tokens': 0, 'tokens': 0, 'sessions': 0})
        for key in ['input_tokens', 'output_tokens', 'tokens', 'sessions']:
            current[key] += row[key] or 0

    for row in safe_rows(cur, f"""
        select strftime('%H', datetime(started_at, 'unixepoch')) bucket,
               coalesce(sum(input_tokens),0) input_tokens,
               coalesce(sum(output_tokens),0) output_tokens,
               coalesce(sum({token_expr()}),0) tokens
        from sessions
        group by bucket
        order by bucket asc
    """):
        bucket = row['bucket'] or '00'
        current = hours.setdefault(bucket, {'bucket': bucket, 'input_tokens': 0, 'output_tokens': 0, 'tokens': 0})
        for key in ['input_tokens', 'output_tokens', 'tokens']:
            current[key] += row[key] or 0

    for row in safe_rows(cur, "select tool_name name, count(*) calls from messages where tool_name is not null and tool_name!='' group by tool_name"):
        tools[row['name']] = tools.get(row['name'], 0) + row['calls']
    con.close()

skills = {}
for path in [os.path.join(base, 'skills', '.usage.json')] + sorted(glob.glob(os.path.join(base, 'profiles', '*', 'skills', '.usage.json'))):
    profile = 'default'
    if '/profiles/' in path:
        profile = path.split('/profiles/')[1].split('/')[0]
    try:
        with open(path, 'r') as handle:
            data = json.load(handle)
        for name, value in data.items():
            row = skills.setdefault(name, {'name': name, 'use_count': 0, 'view_count': 0, 'patch_count': 0, 'profiles': set(), 'last_used_at': None})
            row['use_count'] += int(value.get('use_count') or 0)
            row['view_count'] += int(value.get('view_count') or 0)
            row['patch_count'] += int(value.get('patch_count') or 0)
            row['profiles'].add(profile)
            last = value.get('last_used_at') or value.get('last_viewed_at')
            if last and (not row['last_used_at'] or last > row['last_used_at']):
                row['last_used_at'] = last
    except Exception:
        pass

skills_out = []
for row in skills.values():
    row['profiles'] = sorted(row['profiles'])
    skills_out.append(row)

print(json.dumps({
    'profiles': profiles,
    'recent': sorted(recent, key=lambda x: x.get('ended_at') or x.get('started_at') or 0, reverse=True)[:30],
    'models': models,
    'modelDays': {name: list(days.values()) for name, days in model_days.items()},
    'platforms': platforms,
    'days': list(days.values()),
    'hours': list(hours.values()),
    'tools': sorted([{'name': k, 'calls': v} for k, v in tools.items()], key=lambda x: x['calls'], reverse=True)[:30],
    'skills': sorted(skills_out, key=lambda x: (x['use_count'], x['patch_count']), reverse=True)[:40],
    'events': sorted(events, key=lambda x: x.get('created_at') or '', reverse=True)[:160],
}, ensure_ascii=False))
PY`;
  const raw = await tryExec(config, store, command, "{}");
  return parseJson(raw, {});
}

function pythonString(value) {
  return JSON.stringify(String(value ?? ""));
}

async function collectHermesFiles(config, store, hermesHome) {
  const command = String.raw`python3 - <<'PY'
import glob, json, os, re

base = os.path.expanduser(${pythonString(hermesHome)})
skill_roots = [base, os.path.expanduser('~/.codex/skills'), os.path.expanduser('~/.codex')]

def normalize_name(value):
    return re.sub(r'[^a-z0-9]+', '-', str(value or '').lower()).strip('-')

def safe_read(path, limit=18000, redact=False):
    try:
        with open(path, 'r', errors='replace') as handle:
            text = handle.read(limit)
    except Exception:
        return ''
    if redact:
        lines = []
        for line in text.splitlines():
            if '=' in line and not line.lstrip().startswith('#'):
                key = line.split('=', 1)[0]
                lines.append(key + '=configured')
            else:
                lines.append(line)
        return '\n'.join(lines)
    return text

configs = []
for pattern in ['config.yaml', 'config.yml', '.env', 'settings.json', 'profiles/*/config.yaml', 'profiles/*/.env']:
    for path in sorted(glob.glob(os.path.join(base, pattern))):
        configs.append({
            'name': os.path.basename(path),
            'path': path,
            'profile': path.split('/profiles/')[1].split('/')[0] if '/profiles/' in path else 'global',
            'type': os.path.splitext(path)[1].lstrip('.') or 'env',
            'content': safe_read(path, redact=os.path.basename(path) == '.env'),
        })

profile_docs = []
seen_profile_paths = set()
for pattern in ['profiles/*/*.md', 'profiles/*/**/*.md']:
    for path in sorted(glob.glob(os.path.join(base, pattern), recursive=True)):
        if not os.path.isfile(path):
            continue
        if path in seen_profile_paths:
            continue
        seen_profile_paths.add(path)
        rel = os.path.relpath(path, base)
        rel_path = '/' + rel.replace(os.sep, '/') + '/'
        if any(token in rel_path for token in ['/skills/', '/node_modules/', '/.venv/', '/dist/', '/build/', '/coverage/', '/site-packages/']):
            continue
        profile_docs.append({
            'name': os.path.basename(path),
            'path': path,
            'profile': path.split('/profiles/')[1].split('/')[0] if '/profiles/' in path else 'global',
            'content': safe_read(path),
        })

profile_rank = {'soul.md': 0, 'identity.md': 1, 'voice.md': 2, 'agents.md': 3, 'agent.md': 4, 'memory.md': 5, 'user.md': 6, 'readme.md': 7}
profile_buckets = {}
for item in profile_docs:
    profile_buckets.setdefault(item['profile'], []).append(item)
profile_docs = []
for profile, items in profile_buckets.items():
    items.sort(key=lambda item: (profile_rank.get(item['name'].lower(), 50), item['name'].lower(), item['path']))
    profile_docs.extend(items[:28])

skill_docs = []
seen_skill_paths = set()
usage_skill_names = set()
for usage_path in [os.path.join(base, 'skills/.usage.json')] + sorted(glob.glob(os.path.join(base, 'profiles/*/skills/.usage.json'))):
    if not os.path.isfile(usage_path):
        continue
    profile = usage_path.split('/profiles/')[1].split('/')[0] if '/profiles/' in usage_path else 'global'
    try:
        with open(usage_path, 'r', errors='replace') as handle:
            usage_data = json.load(handle)
    except Exception:
        usage_data = {}
    rows = usage_data.items() if isinstance(usage_data, dict) else enumerate(usage_data if isinstance(usage_data, list) else [])
    for key, value in rows:
        if isinstance(value, dict):
            name = value.get('name') or value.get('skill') or key
        else:
            name = key
        if not name:
            continue
        usage_skill_names.add(str(name))
        skill_docs.append({
            'name': str(name) + '.usage.json',
            'skill': str(name),
            'path': usage_path + '#' + str(name),
            'profile': profile,
            'type': 'json',
            'content': json.dumps(value, ensure_ascii=False, indent=2) if isinstance(value, (dict, list)) else str(value),
            'readonly': True,
            'source': '.usage.json',
        })

for root in skill_roots:
    if not os.path.isdir(root):
        continue
    for pattern in ['skills/**/*.md', 'skills/**/*.yaml', 'skills/**/*.yml', 'skills/**/*.json', 'profiles/*/skills/**/*.md', 'profiles/*/skills/**/*.yaml', 'profiles/*/skills/**/*.yml', 'profiles/*/skills/**/*.json', '**/SKILL.md']:
      for path in sorted(glob.glob(os.path.join(root, pattern), recursive=True)):
        if not os.path.isfile(path):
            continue
        if path in seen_skill_paths:
            continue
        seen_skill_paths.add(path)
        rel = os.path.relpath(path, root)
        parts = rel.split(os.sep)
        skill_name = os.path.splitext(os.path.basename(path))[0]
        if 'skills' in parts:
            idx = parts.index('skills')
            if idx + 1 < len(parts):
                skill_name = parts[idx + 1] if len(parts) > idx + 2 else os.path.splitext(parts[idx + 1])[0]
        skill_docs.append({
            'name': os.path.basename(path),
            'skill': skill_name,
            'path': path,
            'profile': path.split('/profiles/')[1].split('/')[0] if '/profiles/' in path else 'global',
            'type': os.path.splitext(path)[1].lstrip('.') or 'text',
            'content': safe_read(path),
        })

for root in [base]:
    for path in glob.glob(os.path.join(root, '**/*'), recursive=True):
        if not os.path.isfile(path):
            continue
        rel_path = '/' + os.path.relpath(path, root).replace(os.sep, '/') + '/'
        if any(token in rel_path for token in ['/node_modules/', '/.venv/', '/dist/', '/build/', '/coverage/', '/site-packages/', '/logs/']):
            continue
        ext = os.path.splitext(path)[1].lower()
        if ext not in ('.md', '.yaml', '.yml', '.json', '.txt'):
            continue
        normalized_path = normalize_name(path)
        matched = next((name for name in usage_skill_names if normalize_name(name) and normalize_name(name) in normalized_path), None)
        if not matched or path in seen_skill_paths:
            continue
        seen_skill_paths.add(path)
        skill_docs.append({
            'name': os.path.basename(path),
            'skill': matched,
            'path': path,
            'profile': path.split('/profiles/')[1].split('/')[0] if '/profiles/' in path else 'global',
            'type': os.path.splitext(path)[1].lstrip('.') or 'text',
            'content': safe_read(path),
        })

print(json.dumps({'configs': configs[:40], 'profileDocs': profile_docs[:120], 'skillDocs': skill_docs[:160]}, ensure_ascii=False))
PY`;
  return parseJson(await tryExec(config, store, command, "{}"), { configs: [], profileDocs: [], skillDocs: [] });
}

async function collectHermesJobs(config, store) {
  const command = "printf '[crontab]\\n'; crontab -l 2>/dev/null || true; printf '\\n[timers]\\n'; systemctl list-timers --all --no-pager 2>/dev/null | head -80 || true";
  const output = await tryExec(config, store, command, "");
  let section = "crontab";
  const jobs = [];
  output.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (trimmed === "[crontab]") {
      section = "crontab";
      return;
    }
    if (trimmed === "[timers]") {
      section = "systemd";
      return;
    }
    if (/^NEXT\s+LEFT\s+LAST/.test(trimmed) || /^-+\s*$/.test(trimmed)) return;
    if (section === "crontab" && /^[#A-Z_]+=/.test(trimmed)) return;
    if (section === "crontab") {
      const parts = trimmed.split(/\s+/);
      jobs.push({
        id: `cron-${jobs.length + 1}`,
        source: "crontab",
        minute: parts[0] ?? "*",
        hour: parts[1] ?? "*",
        dayOfMonth: parts[2] ?? "*",
        month: parts[3] ?? "*",
        dayOfWeek: parts[4] ?? "*",
        schedule: parts.slice(0, 5).join(" "),
        command: parts.slice(5).join(" "),
        raw: trimmed,
        status: "ativo",
      });
      return;
    }
    const columns = trimmed.split(/\s{2,}/).filter(Boolean);
    const unit = columns.find((column) => /\.timer\b/.test(column)) ?? trimmed.match(/\S+\.timer\b/)?.[0] ?? "timer";
    const activates = columns.find((column) => /\.service\b/.test(column)) ?? trimmed.match(/\S+\.service\b/)?.[0] ?? "";
    jobs.push({
      id: `timer-${jobs.length + 1}`,
      source: "systemd",
      schedule: columns[0] ?? trimmed,
      command: unit,
      raw: trimmed,
      unit,
      activates,
      status: "ativo",
    });
  });
  return { raw: output, jobs };
}

function buildRealSessions(analytics) {
  return (analytics.recent ?? []).map((session) => ({
    ...session,
    status: session.ended_at ? "inactive" : "active",
    tokens: totalSessionTokens(session),
  }));
}

function buildRealModels(analytics) {
  const merged = mergeByKey(analytics.models ?? [], "name", ["sessions", "tokens"])
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 6);
  const total = merged.reduce((sum, item) => sum + item.tokens, 0) || 1;
  return merged.map((item) => ({
    name: item.name,
    share: Math.max(1, Math.round((item.tokens / total) * 100)),
  }));
}

function normalizeAgentId(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildRealAgents(analytics, kanban) {
  const tasks = Object.values(kanban).flat();
  const profileRows = (analytics.profiles ?? []).filter((profile) => profile.profile !== "default");
  const recentSessions = analytics.recent ?? [];
  const eventRows = analytics.events ?? [];
  const colors = ["orange", "magenta", "cyan", "success", "warning"];

  return profileRows.map((profile, index) => {
    const ownedTasks = tasks.filter((task) => String(task.owner).toLowerCase() === profile.profile);
    const currentTask = ownedTasks.find((task) => !String(task.meta).includes("done")) ?? ownedTasks[0];
    const profileSessions = recentSessions
      .filter((session) => session.profile === profile.profile)
      .slice(0, 5);
    const workEvents = eventRows
      .filter((event) => event.profile === profile.profile)
      .slice(0, 14)
      .map((event) => {
        const content = String(event.content || "").replace(/\s+/g, " ").trim();
        const tool = event.tool_name || (content.includes("tool") ? "tool-call" : event.role || "message");
        return {
          id: event.id ?? `${profile.profile}-${event.created_at}-${tool}`,
          time: event.created_at ?? "",
          type: tool,
          role: event.role ?? "event",
          sessionId: event.session_id ?? "",
          message: content.slice(0, 260) || `${event.role ?? "event"} registrado`,
        };
      });
    const sessionEvents = profileSessions.map((session) => ({
      id: `${profile.profile}-${session.id}`,
      time: session.started_at ?? "",
      type: `${session.source ?? "session"} / ${session.model ?? "unknown"}`,
      role: session.ended_at ? "closed session" : "active session",
      sessionId: session.id,
      message: `${session.title || "Sessao sem titulo"} · ${compactTokens(totalSessionTokens(session))} · ${session.tool_call_count ?? 0} tool calls`,
    }));
    const monitorEvents = workEvents.length ? workEvents : sessionEvents;
    const activeSession = profileSessions.find((session) => !session.ended_at) ?? profileSessions[0];
    return {
      id: profile.profile,
      name: profile.profile[0].toUpperCase() + profile.profile.slice(1),
      role: "Hermes profile",
      color: colors[index % colors.length],
      status: Number(profile.active_sessions) > 0 ? "active" : "idle",
      currentTask: currentTask?.title ?? activeSession?.title ?? `${compactNumber(profile.sessions)} sessions registradas`,
      project: "Hermes",
      branch: "profile",
      workspace: `/root/.hermes/profiles/${profile.profile}`,
      progress: Math.min(96, Math.max(12, Math.round((Number(profile.messages) / 6500) * 100))),
      tool: "Hermes Agent",
      monitorTitle: `${profile.profile}/state.db`,
      monitorLines: [
        `sessions: ${profile.sessions}`,
        `messages: ${profile.messages}`,
        `tokens: ${compactNumber(profile.tokens)}`,
        `tool calls: ${profile.tool_calls}`,
      ],
      logs: monitorEvents.length
        ? monitorEvents.slice(0, 8).map((event) => `${event.type}: ${event.message}`)
        : [
          `${compactNumber(profile.sessions)} sessions`,
          `${compactNumber(profile.messages)} mensagens`,
          `${compactNumber(profile.tokens)} tokens`,
        ],
      workEvents: monitorEvents,
      subagents: profileSessions.map((session, childIndex) => ({
        id: `${profile.profile}-${session.id ?? childIndex}`,
        name: `${session.source ?? "session"}-${childIndex + 1}`,
        status: session.ended_at ? "closed" : "active",
        model: session.model ?? "unknown",
        task: session.title || `${session.source ?? "session"} · ${compactNumber(totalSessionTokens(session))} tokens`,
        tokens: totalSessionTokens(session),
      })),
      tasks: ownedTasks.slice(0, 6).map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
      })),
    };
  });
}

function subscriptionPlanFor(modelName) {
  const normalized = String(modelName).toLowerCase();
  if (normalized.includes("gpt") || normalized.includes("codex")) {
    return { id: "codex", name: "Codex", plan: "US200", monthlyCost: 200 };
  }
  if (normalized.includes("claude") || normalized.includes("anthropic")) {
    return { id: "claude-code", name: "Claude Code", plan: "US100", monthlyCost: 100 };
  }
  if (normalized.includes("glm") || normalized.includes("z.ai") || normalized.includes("zai")) {
    return { id: "glm", name: "GLM", plan: "US10", monthlyCost: 10 };
  }
  if (normalized.includes("kimi")) {
    return { id: "kimi", name: "Kimi Coding", plan: "US20", monthlyCost: 20 };
  }
  if (normalized.includes("xiaomi") || normalized.includes("mi-")) {
    return { id: "xiaomi", name: "Xiaomi", plan: "US10", monthlyCost: 10 };
  }
  if (normalized.includes("minimax")) {
    return { id: "minimax", name: "MiniMax", plan: "US20", monthlyCost: 20 };
  }
  return null;
}

function buildRealSubscriptions(analytics) {
  const planMap = new Map(mockMissionControl.subscriptions.map((item) => [item.id, { ...item, tokens: 0, sessions: 0, models: new Set(), dailyBuckets: new Map() }]));
  const modelRows = mergeByKey(analytics.models ?? [], "name", ["sessions", "tokens"]);

  modelRows.forEach((model) => {
    const plan = subscriptionPlanFor(model.name);
    if (!plan) return;
    const current = planMap.get(plan.id) ?? {
      ...plan,
      dailyUsed: 0,
      weeklyUsed: 0,
      monthlyForecast: 0,
      utilization: 0,
      trend: "sem dados",
      recommendation: "",
      action: "monitorar",
      dailySeries: [],
      tokens: 0,
      sessions: 0,
      models: new Set(),
      dailyBuckets: new Map(),
    };

    current.tokens += Number(model.tokens || 0);
    current.sessions += Number(model.sessions || 0);
    current.models.add(model.name);

    (analytics.modelDays?.[model.name] ?? []).forEach((day) => {
      const bucket = day.bucket ?? "unknown";
      current.dailyBuckets.set(bucket, Number(current.dailyBuckets.get(bucket) || 0) + Number(day.tokens || 0));
    });
    planMap.set(plan.id, current);
  });

  const maxTokens = Math.max(...[...planMap.values()].map((item) => Number(item.tokens || 0)), 1);
  return [...planMap.values()].map((item) => {
    const dailyTokenSeries = [...item.dailyBuckets.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(-7)
      .map(([, tokens]) => Number(tokens || 0));
    const dailyValues = dailyTokenSeries.map((tokens) => Math.round(tokens / 10_000));
    const monthlyTokenUnits = Math.round(Number(item.tokens || 0) / 1000);
    const weeklyTokens = dailyTokenSeries.reduce((sum, tokens) => sum + tokens, 0);
    const lastDayTokens = dailyTokenSeries.at(-1) ?? 0;
    const utilization = Math.min(100, Math.round((Number(item.tokens || 0) / maxTokens) * 100));
    const hasUsage = Number(item.tokens || 0) > 0;
    const lowUse = utilization < 5;
    const costForecast = hasUsage
      ? Math.min(item.monthlyCost, Math.max(1, Math.round(item.monthlyCost * Math.max(0.08, utilization / 100))))
      : 0;

    return {
      id: item.id,
      name: item.name,
      plan: item.plan,
      monthlyCost: item.monthlyCost,
      dailyUsed: lastDayTokens,
      weeklyUsed: weeklyTokens,
      monthlyForecast: costForecast,
      tokenVolume: compactTokens(item.tokens),
      tokenRaw: Number(item.tokens || 0),
      tokenUnits: monthlyTokenUnits,
      utilization,
      trend: hasUsage ? `${compactNumber(item.tokens)} tokens · ${item.sessions} sessions` : "sem uso no Hermes",
      recommendation: hasUsage
        ? `Uso real detectado em ${[...item.models].join(", ")}. Compare este volume com o custo fixo de ${item.plan}.`
        : "Nenhum token real encontrado no Hermes para esta assinatura. Candidata a pausar, cancelar ou manter apenas se for usada fora do Hermes.",
      action: hasUsage ? (lowUse ? "avaliar" : "monitorar") : "cancelar",
      dailySeries: dailyValues.length ? dailyValues : [0, 0, 0, 0, 0, 0, 0],
      dailyTokenSeries: dailyTokenSeries.length ? dailyTokenSeries : [0, 0, 0, 0, 0, 0, 0],
    };
  });
}

function buildRealSkills(analytics) {
  const skills = (analytics.skills ?? []).slice(0, 10).map((skill) => `${skill.name} (${skill.use_count})`);
  return skills.length ? skills : mockMissionControl.skills;
}

function buildRealActivity(analytics, logLines) {
  const recent = (analytics.recent ?? []).slice(0, 8).map((session) => ({
    actor: session.profile === "default" ? "Hermes" : session.profile,
    message: session.title || `${session.source} · ${session.model} · ${compactNumber(totalSessionTokens(session))} tokens`,
    status: session.ended_at ? "closed" : "active",
    tone: session.ended_at ? "ok" : "warn",
  }));
  if (recent.length) return recent;
  return logLines.length
    ? logLines.map((line, index) => ({
      actor: "Hermes",
      message: line,
      status: index === logLines.length - 1 ? "LIVE" : "LOG",
      tone: "ok",
    }))
    : mockMissionControl.activity;
}

function buildRealApiKeys(configYaml, statusText) {
  const source = `${configYaml}\n${statusText}`.toLowerCase();
  const providers = [
    { id: "openai", name: "OpenAI", terms: ["openai", "openai_api_key"] },
    { id: "anthropic", name: "Anthropic", terms: ["anthropic", "anthropic_api_key"] },
    { id: "openrouter", name: "OpenRouter", terms: ["openrouter", "openrouter_api_key"] },
    { id: "zai", name: "Z.AI / GLM", terms: ["z.ai", "zai", "glm", "zai_api_key"] },
    { id: "kimi", name: "Kimi", terms: ["kimi", "moonshot"] },
    { id: "minimax", name: "MiniMax", terms: ["minimax"] },
    { id: "elevenlabs", name: "ElevenLabs", terms: ["elevenlabs"] },
    { id: "github", name: "GitHub", terms: ["github", "gh_token", "github_token"] },
  ];

  return providers.map((provider, index) => {
    const relevant = source.split("\n").filter((line) => provider.terms.some((term) => line.includes(term)));
    const configured = relevant.some((line) => (
      line.includes("configured")
      || line.includes("set")
      || line.includes("ok")
      || line.includes("true")
      || line.includes("***")
    ) && !line.includes("not set") && !line.includes("not configured") && !line.includes("missing") && !line.includes("false"));

    return {
      id: provider.id,
      name: provider.name,
      maskedValue: configured ? "server/.env secret" : "nao configurado",
      detail: relevant[0] ? "Hermes status/config via SSH" : "Nao encontrado no Hermes status",
      latency: configured ? 160 + index * 24 : 0,
      usage: configured ? Math.max(8, 78 - index * 9) : 0,
      status: configured ? "healthy" : "disabled",
    };
  });
}

function parseCliTools(raw, analytics) {
  if (!raw) return mockMissionControl.cliTools;
  const agentCount = Math.max(1, (analytics.profiles ?? []).filter((profile) => profile.profile !== "default").length);
  const labels = {
    codex: "Codex CLI",
    claude: "Claude Code CLI",
    gh: "GitHub CLI",
    node: "Node.js",
    python3: "Python",
    hermes: "Hermes CLI",
  };

  return raw.split("\n").filter(Boolean).map((line) => {
    const [command, status, ...versionParts] = line.split("|");
    const version = versionParts.join("|").trim() || "sem versao";
    return {
      name: labels[command] ?? command,
      version,
      status,
      agents: status === "installed" ? agentCount : 0,
      lastRun: "verificado via SSH",
      command,
    };
  });
}

function buildRealDocs(analytics, statusText, registryDocs) {
  if (registryDocs?.length) {
    return registryDocs.map((doc) => ({
      ...doc,
      content: doc.content ?? doc.text ?? doc.markdown ?? doc.body ?? "",
    }));
  }
  return mockMissionControl.docs;
}

function buildRealApps(config, status, registryApps) {
  if (registryApps?.length) return registryApps;
  return [
    {
      id: "okami-site",
      name: "Okami Site",
      url: "https://okami-site.msant262.workers.dev",
      detail: "Design system e website publico",
      status: "Online",
      uptime: 99.99,
      env: "prod",
    },
    {
      id: "hermes-vps",
      name: "Hermes VPS",
      url: `ssh://${config.sshUser}@${config.sshHost}:${config.sshPort}`,
      detail: status?.detail ?? "Acesso privado via SSH",
      status: config.sshHost ? "SSH" : "Configurar",
      uptime: config.sshHost ? 100 : 0,
      env: "private",
    },
    {
      id: "mission-control-api",
      name: "Mission Control API",
      url: "http://localhost:3001/api/health",
      detail: "Backend local que coleta dados da VPS",
      status: "Local",
      uptime: 100,
      env: "private",
    },
  ];
}

export async function collectKanbanRaw(config, store) {
  const hermesHome = config.hermesHome || "~/.hermes";
  const command = String.raw`python3 - <<'PY'
import json, os, sqlite3

base = os.path.expanduser(${pythonString(hermesHome)})
db = os.path.join(base, 'kanban.db')
out = []
boards_map = {}

def rows(cur, sql, args=()):
    try:
        return [dict(row) for row in cur.execute(sql, args)]
    except Exception:
        return []

if os.path.exists(db):
    con = sqlite3.connect(db)
    con.row_factory = sqlite3.Row
    cur = con.cursor()
    tables = [row['name'] for row in rows(cur, "select name from sqlite_master where type='table'")]

    # Mapa board_id -> nome, lido de qualquer tabela 'boards'/'board'.
    for table in tables:
        if table.lower() not in ('boards', 'board'):
            continue
        cols = [row['name'] for row in rows(cur, f"pragma table_info({table})")]
        lower_cols = {col.lower(): col for col in cols}
        id_col = next((lower_cols[name] for name in ['id', 'board_id', 'uuid', 'slug', 'key'] if name in lower_cols), None)
        name_col = next((lower_cols[name] for name in ['name', 'title', 'label', 'slug'] if name in lower_cols), None)
        if not id_col:
            continue
        for row in rows(cur, f"select * from {table}"):
            board_id = row.get(id_col)
            if board_id is None:
                continue
            boards_map[str(board_id)] = str(row.get(name_col) or board_id) if name_col else str(board_id)

    for table in tables:
        lower_table = table.lower()
        if any(token in lower_table for token in ['comment', 'event', 'log', 'history', 'run', 'attempt']):
            continue
        cols = [row['name'] for row in rows(cur, f"pragma table_info({table})")]
        lower_cols = {col.lower(): col for col in cols}
        has_title = any(name in lower_cols for name in ['title', 'name', 'summary'])
        has_task_shape = has_title and any(name in lower_cols for name in ['status', 'state', 'column', 'assignee', 'owner', 'body', 'description', 'notes'])
        if 'task' not in lower_table and not has_task_shape:
            continue
        order_col = next((lower_cols[name] for name in ['updated_at', 'updatedat', 'created_at', 'createdat', 'started_at', 'id'] if name in lower_cols), None)
        sql = f"select * from {table}"
        if order_col:
            sql += f" order by {order_col} desc"
        sql += " limit 240"
        for row in rows(cur, sql):
            archived_value = row.get('archived') if 'archived' in row else row.get('is_archived')
            if str(row.get('status') or row.get('state') or '').lower() in ('archived', 'archive'):
                continue
            if archived_value not in (None, '', 0, '0', False, 'false', 'False'):
                continue
            if row.get('archived_at') not in (None, ''):
                continue
            title = row.get('title') or row.get('name') or row.get('summary') or ''
            body = row.get('body') or row.get('description') or row.get('notes') or ''
            if not str(title).strip() and not str(body).strip():
                continue
            out.append({**row, '_table': table})

print(json.dumps({'tasks': out, 'boards': boards_map, 'source': db}, ensure_ascii=False))
PY`;
  const rawDb = await tryExec(config, store, command, "");
  const parsedDb = parseJson(rawDb, null);
  if (parsedDb?.tasks?.length) return rawDb;

  return tryExec(config, store, "hermes kanban list --json 2>/dev/null || hermes tasks list --json 2>/dev/null || true", "");
}

// Candidatos de campo que separam um board do outro, em ordem de preferência.
const BOARD_FIELD_CANDIDATES = [
  "board_id", "boardId", "board", "board_name", "boardName",
  "tenant", "project", "workspace", "space", "_table",
];

// Detecta automaticamente qual campo identifica o board: usa o candidato com
// mais valores distintos (>1). Se nenhum tiver mais de um valor, não há boards
// múltiplos e o comportamento atual (board único) é mantido.
function detectBoardField(items) {
  let best = null;
  let bestCount = 1;
  for (const field of BOARD_FIELD_CANDIDATES) {
    const values = new Set();
    for (const item of items) {
      const value = item?.[field];
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        values.add(String(value));
      }
    }
    if (values.size > bestCount) {
      bestCount = values.size;
      best = field;
    }
  }
  return best;
}

function resolveBoardName(item, field, boardsMap) {
  if (!field) return null;
  const raw = item?.[field];
  if (raw === undefined || raw === null || String(raw).trim() === "") return null;
  const key = String(raw);
  return boardsMap?.[key] ?? key;
}

function parseKanbanJson(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed) ? parsed : parsed.tasks ?? parsed.items ?? [];
    const boardsMap = (!Array.isArray(parsed) && parsed.boards) || {};
    const boardField = detectBoardField(items);
    const board = {};
    const statusLabels = {
      blocked: "Blocked",
      done: "Done",
      complete: "Done",
      completed: "Done",
      review: "Review",
      "in_progress": "In Progress",
      progress: "In Progress",
      doing: "In Progress",
      active: "In Progress",
      running: "In Progress",
      todo: "Todo",
      backlog: "Backlog",
      triage: "Triage",
    };

    items.forEach((item) => {
      const status = String(item.status ?? item.column ?? "triage").toLowerCase();
      const rawStatusText = JSON.stringify({
        status: item.status,
        column: item.column,
        blocked: item.blocked,
        blocked_reason: item.blocked_reason,
        state: item.state,
      }).toLowerCase();
      const blocked = rawStatusText.includes("blocked") || rawStatusText.includes("bloque");
      const normalized = blocked ? "blocked" : status.replaceAll("-", "_").replaceAll(" ", "_");
      const column = statusLabels[normalized]
        ?? Object.entries(statusLabels).find(([key]) => normalized.includes(key))?.[1]
        ?? (item.status ?? item.column ?? "Triage");

      if (!board[column]) board[column] = [];
      board[column].push({
        id: item.id ?? item.task_id ?? item.title,
        title: item.title ?? item.name ?? "Hermes task",
        meta: `Hermes kanban.db · ${blocked ? "blocked" : item.status ?? "triage"}`,
        status: blocked ? "blocked" : item.status ?? item.column ?? "triage",
        priority: item.priority ?? "P2",
        owner: item.assignee ?? item.owner ?? "Hermes",
        estimate: item.updated_at ?? item.updatedAt ?? item.created_at ?? item.createdAt ?? "sync",
        board: resolveBoardName(item, boardField, boardsMap),
        body: item.body ?? item.description ?? item.notes ?? "",
        description: item.description ?? item.body ?? item.notes ?? "",
        raw: item,
      });
    });

    const order = ["Blocked", "In Progress", "Review", "Todo", "Triage", "Backlog", "Done"];
    return Object.fromEntries([
      ...order.filter((column) => board[column]).map((column) => [column, board[column]]),
      ...Object.entries(board).filter(([column]) => !order.includes(column)),
    ]);
  } catch {
    return null;
  }
}

async function collectKanbanDetails(config, store, tasks) {
  const taskIds = tasks.map((task) => task.id).filter(Boolean).slice(0, 40);
  if (!taskIds.length) return {};
  const idsJson = shellQuote(JSON.stringify(taskIds));
  const command = `TASK_IDS=${idsJson} python3 - <<'PY'
import json, os, sqlite3

ids = set(json.loads(os.environ.get('TASK_IDS', '[]')))
db = os.path.expanduser('~/.hermes/kanban.db')
out = {task_id: {'comments': [], 'runHistory': [], 'workLog': []} for task_id in ids}
if not os.path.exists(db):
    print(json.dumps(out))
    raise SystemExit

con = sqlite3.connect(db)
con.row_factory = sqlite3.Row
cur = con.cursor()

def rows(sql, args=()):
    try:
        return [dict(row) for row in cur.execute(sql, args)]
    except Exception:
        return []

tables = [row['name'] for row in rows("select name from sqlite_master where type='table'")]
for table in tables:
    cols = [row['name'] for row in rows(f"pragma table_info({table})")]
    if not cols:
        continue
    match_cols = [col for col in ['task_id', 'taskId', 'id'] if col in cols]
    if not match_cols:
        continue
    order_col = next((col for col in ['created_at', 'updated_at', 'started_at', 'timestamp', 'id'] if col in cols), match_cols[0])
    for task_id in ids:
        found = []
        for col in match_cols:
            found += rows(f"select * from {table} where {col}=? order by {order_col} desc limit 12", (task_id,))
        if not found:
            continue
        key = 'workLog'
        lower = table.lower()
        if 'comment' in lower:
            key = 'comments'
        elif 'run' in lower or 'attempt' in lower or 'execution' in lower:
            key = 'runHistory'
        elif 'event' in lower or 'log' in lower or 'history' in lower:
            key = 'workLog'
        out.setdefault(task_id, {'comments': [], 'runHistory': [], 'workLog': []})
        out[task_id][key].extend([{**row, '_table': table} for row in found])

for value in out.values():
    for key in ['comments', 'runHistory', 'workLog']:
        value[key] = value[key][:16]

print(json.dumps(out, ensure_ascii=False))
PY`;
  const raw = await tryExec(config, store, command, "{}");
  return redactDeep(parseJson(raw, {}));
}

function attachKanbanDetails(kanban, details) {
  return Object.fromEntries(Object.entries(kanban).map(([column, tasks]) => [
    column,
    tasks.map((task) => ({
      ...task,
      comments: details[task.id]?.comments ?? [],
      runHistory: details[task.id]?.runHistory ?? [],
      workLog: details[task.id]?.workLog ?? [],
    })),
  ]));
}

export async function collectHermesState(config, store) {
  if (!config.sshHost || !config.sshUser) {
    return mockMissionControl;
  }

  const hermesHome = config.hermesHome || "~/.hermes";
  const quotedHome = shellPath(hermesHome);
  const [hostInfo, configYaml, statusText, envKeys, logs, kanbanRaw, analytics, cliRaw, hermesFiles, hermesJobs] = await Promise.all([
    tryExec(config, store, "printf '%s|' \"$(hostname)\"; whoami; command -v hermes || true"),
    tryExec(config, store, `test -f ${quotedHome}/config.yaml && sed -n '1,220p' ${quotedHome}/config.yaml || true`),
    tryExec(config, store, "hermes config 2>/dev/null || hermes status 2>/dev/null || true"),
    tryExec(config, store, `test -f ${quotedHome}/.env && sed -n '1,220p' ${quotedHome}/.env | sed -E 's/(=).*/=configured/' || true`),
    tryExec(config, store, `test -d ${quotedHome}/logs && find ${quotedHome}/logs -maxdepth 1 -type f | head -5 | xargs tail -n 20 2>/dev/null || true`),
    collectKanbanRaw(config, store),
    collectAnalytics(config, store),
    tryExec(config, store, "for c in codex claude gh node python3 hermes; do if command -v \"$c\" >/dev/null 2>&1; then printf '%s|installed|' \"$c\"; \"$c\" --version 2>&1 | head -1; else printf '%s|missing|not installed\\n' \"$c\"; fi; done"),
    collectHermesFiles(config, store, hermesHome),
    collectHermesJobs(config, store),
  ]);

  const parsedKanban = parseKanbanJson(kanbanRaw) ?? mockMissionControl.kanban;
  const kanbanDetailMap = await collectKanbanDetails(config, store, Object.values(parsedKanban).flat());
  const kanban = attachKanbanDetails(parsedKanban, kanbanDetailMap);
  const totalProfile = (analytics.profiles ?? []).find((profile) => profile.profile === "default")
    ?? (analytics.profiles ?? []).reduce((sum, profile) => ({
      profile: "total",
      sessions: Number(sum.sessions || 0) + Number(profile.sessions || 0),
      messages: Number(sum.messages || 0) + Number(profile.messages || 0),
      tool_calls: Number(sum.tool_calls || 0) + Number(profile.tool_calls || 0),
      tokens: Number(sum.tokens || 0) + Number(profile.tokens || 0),
      input_tokens: Number(sum.input_tokens || 0) + Number(profile.input_tokens || 0),
      output_tokens: Number(sum.output_tokens || 0) + Number(profile.output_tokens || 0),
      active_sessions: Number(sum.active_sessions || 0) + Number(profile.active_sessions || 0),
    }), {});
  const realModels = buildRealModels(analytics);
  const realAgents = buildRealAgents(analytics, kanban);
  const realSkills = buildRealSkills(analytics);
  const realSubscriptions = buildRealSubscriptions(analytics);
  const realApiKeys = buildRealApiKeys(`${configYaml}\n${envKeys}`, statusText);
  const realCliTools = parseCliTools(cliRaw, analytics);
  const registryApis = await store.getRegistry("apis", []);
  const registryApps = await store.getRegistry("apps", []);
  const registryDocs = await store.getRegistry("docs", []);
  const mergedApiKeys = realApiKeys.map((api) => ({
    ...api,
    ...(registryApis.find((item) => item.id === api.id) ?? {}),
  })).concat(registryApis.filter((item) => !realApiKeys.some((api) => api.id === item.id)));
  const hostParts = hostInfo.split("|");
  const hostName = hostParts[0] || config.sshHost;
  const userAndHermes = hostParts[1] || "";
  const hermesInstalled = userAndHermes.includes("hermes");
  const logLines = redact(logs).split("\n").filter(Boolean).slice(-8);
  const tokenDays = (analytics.days ?? []).slice(-12);
  const inputSeries = tokenDays.map((day) => Math.max(1, Math.round((Number(day.input_tokens) || 0) / 1000)));
  const outputSeries = tokenDays.map((day) => Math.max(1, Math.round((Number(day.output_tokens) || 0) / 1000)));
  const platformRows = mergeByKey(analytics.platforms ?? [], "source", ["sessions", "messages", "tokens"])
    .sort((a, b) => b.tokens - a.tokens);
  const blockedTasks = Object.values(kanban).flat().filter((task) => String(task.meta).includes("blocked")).length;

  return {
    ...mockMissionControl,
    status: {
      label: hermesInstalled ? "Hermes conectado" : "VPS conectada",
      detail: `${config.sshUser}@${config.sshHost} · ${hostName}`,
      healthy: true,
      updatedAt: new Date().toISOString(),
    },
    metrics: [
      { label: "ssh", value: "online", delta: `${config.sshUser}@${config.sshHost}`, hot: true },
      { label: "tokens", value: compactNumber(totalProfile.tokens), delta: `${compactNumber(totalProfile.input_tokens)} in · ${compactNumber(totalProfile.output_tokens)} out` },
      { label: "sessions", value: compactNumber(totalProfile.sessions), delta: `${compactNumber(totalProfile.messages)} mensagens` },
      { label: "kanban", value: `${Object.values(kanban).flat().length}`, delta: `${blockedTasks} bloqueios` },
    ],
    tokenSeries: {
      input: inputSeries.length ? inputSeries : mockMissionControl.tokenSeries.input,
      output: outputSeries.length ? outputSeries : mockMissionControl.tokenSeries.output,
    },
    overview: {
      serviceHealth: [
        { name: "SSH Bridge", value: 100, status: "healthy" },
        { name: "Hermes CLI", value: hermesInstalled ? 100 : 80, status: hermesInstalled ? "healthy" : "watch" },
        { name: "Gateway", value: 98, status: "healthy" },
        { name: "Kanban DB", value: Object.values(kanban).flat().length ? 100 : 60, status: Object.values(kanban).flat().length ? "healthy" : "watch" },
      ],
      queue: platformRows.slice(0, 4).map((platform) => ({ label: platform.source, value: platform.sessions })),
      incidents: blockedTasks
        ? [{ severity: "P2", title: `${blockedTasks} tarefas bloqueadas no Hermes Kanban`, owner: "Hermes", eta: "review" }]
        : [],
    },
    models: realModels.length ? realModels : mockMissionControl.models,
    activity: buildRealActivity(analytics, logLines),
    skills: realSkills,
    subscriptions: realSubscriptions.length ? realSubscriptions : mockMissionControl.subscriptions,
    agents: realAgents,
    apiKeys: mergedApiKeys.length ? mergedApiKeys : mockMissionControl.apiKeys,
    apps: buildRealApps(config, null, registryApps),
    docs: buildRealDocs(analytics, statusText, registryDocs),
    cliTools: realCliTools.length ? realCliTools : mockMissionControl.cliTools,
    liveEvents: (analytics.recent ?? []).slice(0, 4).map((session) => ({
      time: new Date((Number(session.ended_at || session.started_at) || Date.now() / 1000) * 1000).toLocaleTimeString("pt-BR"),
      message: `${session.profile}: ${session.title || session.source} · ${compactNumber(totalSessionTokens(session))} tokens`,
    })),
    kanban,
    hermes: {
      ...mockMissionControl.hermes,
      ...config,
      analytics,
      configFiles: hermesFiles.configs ?? [],
      profileDocs: hermesFiles.profileDocs ?? [],
      skillDocs: hermesFiles.skillDocs ?? [],
      jobs: hermesJobs.jobs ?? [],
      jobRaw: hermesJobs.raw ?? "",
      logLines,
      sessions: buildRealSessions(analytics),
      sshStatus: {
        status: "connected",
        latency: "real",
        lastCheck: new Date().toISOString(),
      },
      storage: mockMissionControl.hermes.storage.map((item) => ({
        ...item,
        detail: item.label === "config.yaml" && configYaml ? "lido via SSH e redigido" : item.detail,
      })),
    },
  };
}

export async function createKanbanTask(config, store, task) {
  const title = shellQuote(task.title);
  const body = task.body ? ` --body ${shellQuote(task.body)}` : "";
  const assignee = task.assignee ? ` --assignee ${shellQuote(task.assignee)}` : "";
  const priority = task.priority ? ` --priority ${shellQuote(task.priority)}` : "";
  const command = `hermes kanban create ${title}${body}${assignee}${priority} --json`;
  const result = await sshExec(config, store, command, { timeoutMs: 15000 });
  if (result.exitCode !== 0) {
    throw new Error(result.stderr || `Hermes kanban create failed: ${result.exitCode}`);
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    return { id: `remote_${Date.now()}`, ...task, raw: result.stdout };
  }
}
