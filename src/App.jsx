import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useMissionControl } from "./lib/useMissionControl";
import { useToast } from "./components/Toast";
import { MarkdownLite } from "./components/MarkdownLite";
import { PixelOfficeCanvas } from "./PixelOfficeCanvas";
import {
  bootstrapApiKey,
  clearMissionApiToken,
  connectAgentRuntime,
  createApiKey,
  deleteApiConfig,
  deleteAppConfig,
  deleteAgentRuntimeConfig,
  deleteDocConfig,
  getAuthStatus,
  getHermesConfig,
  getMissionApiToken,
  createHermesKanbanTask,
  isMissionApiConfigured,
  isMissionApiLocalDev,
  listApiKeys,
  revokeApiKey,
  rotateApiSecret,
  runHermesCommand,
  saveApiConfig,
  saveAppConfig,
  saveDocConfig,
  saveHermesCron,
  saveHermesFile,
  saveHermesConfig,
  saveMissionApiToken,
  saveHermesSystemdTimer,
  saveHermesSshPassword,
  testApiConnection,
  testHermesSshConnection,
  uploadHermesSshKey,
} from "./lib/apiClient";

// Cores intercaladas POR ITEM (não por grupo) — distribuídas entre as 4
// cores do envelope OKLCH OKAMI pra dar variedade visual. Cada item tem sua
// própria identidade — o grupo só serve pra organização cognitiva.
const ITEM_ACCENTS = {
  // Operação — rotação 5 itens
  overview: "orange",
  usage:    "cyan",
  kanban:   "magenta",
  office:   "success",
  pixel:    "orange",
  // Dados — rotação 7 itens
  profiles: "cyan",
  sessions: "magenta",
  cron:     "success",
  config:   "orange",
  agents:   "success",
  skills:   "cyan",
  logs:     "magenta",
  hermes:   "success",
  // Extra — rotação 3 itens
  apps:     "orange",
  cli:      "cyan",
  docs:     "magenta",
};

const navGroups = [
  {
    label: "OPERAÇÃO",
    items: [
      ["overview", "⌁", "Overview"],
      ["usage",    "$", "Usage"],
      ["kanban",   "☷", "Kanban"],
      ["office",   "▦", "Office"],
      ["pixel",    "▣", "Pixel"],
    ],
  },
  {
    label: "DADOS",
    items: [
      ["profiles", "♙", "Perfis"],
      ["sessions", "◉", "Sessions"],
      ["cron",     "◷", "Cron"],
      ["config",   "≡", "Agentes"],
      ["skills",   "✦", "Skills"],
      ["logs",     "≋", "Logs"],
    ],
  },
  {
    label: "EXTRA",
    items: [
      ["apps", "↗", "Apps"],
      ["cli",  "▸", "CLIs"],
      ["docs", "◫", "Docs"],
    ],
  },
];

// Lista linear: cada item já vem com sua cor individual (não da seção)
const navItems = navGroups.flatMap((g) =>
  g.items.map(([id, icon, label]) => [id, icon, label, ITEM_ACCENTS[id] || "cyan"]),
);

const LANGUAGE_STORAGE_KEY = "okami.ui.language";
const DEFAULT_LANGUAGE = "pt-BR";

const translations = {
  "pt-BR": {
    "lang.pt": "PT-BR",
    "lang.en": "EN",
    "lang.selector": "Idioma",
    "nav.group.OPERAÇÃO": "OPERAÇÃO",
    "nav.group.DADOS": "DADOS",
    "nav.group.EXTRA": "EXTRA",
    "nav.overview": "Overview",
    "nav.usage": "Usage",
    "nav.kanban": "Kanban",
    "nav.office": "Office",
    "nav.pixel": "Pixel",
    "nav.profiles": "Perfis",
    "nav.sessions": "Sessions",
    "nav.cron": "Cron",
    "nav.config": "Agentes",
    "nav.skills": "Skills",
    "nav.logs": "Logs",
    "nav.apps": "Apps",
    "nav.cli": "CLIs",
    "nav.docs": "Docs",
    "status.sync": "SYNC",
    "status.online": "SISTEMAS ONLINE",
    "status.demo": "DEMO LIVE",
    "button.closeMenu": "Fechar menu",
    "button.openMenu": "Abrir menu",
    "button.close": "Fechar",
    "button.newAgent": "Novo agente",
    "warning.apiFallback": "API da VPS indisponivel. Exibindo demo vivo ate a conexao estabilizar.",
    "overview.eyebrow": "command deck",
    "overview.title": "Operacao Hermes em tempo real",
    "overview.periodFilters": "Filtros de periodo",
    "overview.tokens.title": "Uso de tokens",
    "overview.tokens.subtitle": "input / output",
    "overview.models.title": "Modelos",
    "overview.models.subtitle": "roteador",
    "overview.activity.title": "Atividade recente",
    "overview.activity.subtitle": "live feed",
    "overview.skills.title": "Skills ativas",
    "overview.skills.subtitle": "fila",
    "overview.health.title": "Saude dos servicos",
    "overview.health.subtitle": "uptime",
    "overview.queue.title": "Fila de agentes",
    "overview.queue.subtitle": "workload",
    "overview.incidents.title": "Incidentes",
    "overview.incidents.subtitle": "watchlist",
    "metric.ssh": "SSH",
    "metric.tokens": "Tokens",
    "metric.sessions": "Sessions",
    "metric.kanban": "Kanban",
    "metric.messages": "mensagens",
    "metric.blocks": "bloqueios",
    "metric.period": "periodo",
    "range.1h": "ultima 1h",
    "range.24h": "ultimas 24h",
    "range.7d": "ultimos 7 dias",
    "range.30d": "ultimos 30 dias",
    "section.usage.eyebrow": "subscription control",
    "section.usage.title": "Uso e custo das assinaturas",
    "section.office.eyebrow": "agent floor",
    "section.office.title": "Workstations dos agentes",
    "section.pixel.eyebrow": "pixel ops",
    "section.pixel.title": "Pixel Office dos agentes Hermes",
    "section.kanban.eyebrow": "execution board",
    "section.kanban.title": "Kanban operacional dos agentes",
    "section.config.eyebrow": "agentes",
    "section.config.title": "Agentes",
    "section.hermes.eyebrow": "servidor dos agentes",
    "section.hermes.title": "Servidor dos agentes",
    "section.hermes.embeddedTitle": "Conexao SSH dos agentes",
    "section.profiles.eyebrow": "agent profiles",
    "section.profiles.title": "Perfis, soul, identity e agents.md",
    "section.skills.eyebrow": "skills registry",
    "section.skills.title": "Skills disponiveis no Hermes",
    "section.cron.eyebrow": "automation",
    "section.cron.title": "Crons e timers ativados",
    "section.logs.eyebrow": "observability",
    "section.logs.title": "Logs e eventos do Hermes",
    "section.sessions.eyebrow": "state.db",
    "section.sessions.title": "Sessoes ativas e inativas",
    "section.cli.eyebrow": "coding tools",
    "section.cli.title": "Codex CLI e Claude Code no ambiente Hermes",
  },
  en: {
    "lang.pt": "PT-BR",
    "lang.en": "EN",
    "lang.selector": "Language",
    "nav.group.OPERAÇÃO": "OPERATION",
    "nav.group.DADOS": "DATA",
    "nav.group.EXTRA": "EXTRA",
    "nav.overview": "Overview",
    "nav.usage": "Usage",
    "nav.kanban": "Kanban",
    "nav.office": "Office",
    "nav.pixel": "Pixel",
    "nav.profiles": "Profiles",
    "nav.sessions": "Sessions",
    "nav.cron": "Cron",
    "nav.config": "Agents",
    "nav.skills": "Skills",
    "nav.logs": "Logs",
    "nav.apps": "Apps",
    "nav.cli": "CLIs",
    "nav.docs": "Docs",
    "status.sync": "SYNC",
    "status.online": "SYSTEMS ONLINE",
    "status.demo": "LIVE DEMO",
    "button.closeMenu": "Close menu",
    "button.openMenu": "Open menu",
    "button.close": "Close",
    "button.newAgent": "New agent",
    "warning.apiFallback": "VPS API unavailable. Showing live demo until the connection stabilizes.",
    "overview.eyebrow": "command deck",
    "overview.title": "Hermes operation in real time",
    "overview.periodFilters": "Period filters",
    "overview.tokens.title": "Token usage",
    "overview.tokens.subtitle": "input / output",
    "overview.models.title": "Models",
    "overview.models.subtitle": "router",
    "overview.activity.title": "Recent activity",
    "overview.activity.subtitle": "live feed",
    "overview.skills.title": "Active skills",
    "overview.skills.subtitle": "queue",
    "overview.health.title": "Service health",
    "overview.health.subtitle": "uptime",
    "overview.queue.title": "Agent queue",
    "overview.queue.subtitle": "workload",
    "overview.incidents.title": "Incidents",
    "overview.incidents.subtitle": "watchlist",
    "metric.ssh": "SSH",
    "metric.tokens": "Tokens",
    "metric.sessions": "Sessions",
    "metric.kanban": "Kanban",
    "metric.messages": "messages",
    "metric.blocks": "blocks",
    "metric.period": "period",
    "range.1h": "last 1h",
    "range.24h": "last 24h",
    "range.7d": "last 7 days",
    "range.30d": "last 30 days",
    "section.usage.eyebrow": "subscription control",
    "section.usage.title": "Subscription usage and cost",
    "section.office.eyebrow": "agent floor",
    "section.office.title": "Agent workstations",
    "section.pixel.eyebrow": "pixel ops",
    "section.pixel.title": "Hermes agent Pixel Office",
    "section.kanban.eyebrow": "execution board",
    "section.kanban.title": "Agent operational Kanban",
    "section.config.eyebrow": "agents",
    "section.config.title": "Agents",
    "section.hermes.eyebrow": "agent server",
    "section.hermes.title": "Agent server",
    "section.hermes.embeddedTitle": "Agent SSH connection",
    "section.profiles.eyebrow": "agent profiles",
    "section.profiles.title": "Profiles, soul, identity and agents.md",
    "section.skills.eyebrow": "skills registry",
    "section.skills.title": "Available Hermes skills",
    "section.cron.eyebrow": "automation",
    "section.cron.title": "Active crons and timers",
    "section.logs.eyebrow": "observability",
    "section.logs.title": "Hermes logs and events",
    "section.sessions.eyebrow": "state.db",
    "section.sessions.title": "Active and inactive sessions",
    "section.cli.eyebrow": "coding tools",
    "section.cli.title": "Codex CLI and Claude Code in Hermes",
  },
};

const I18nContext = createContext({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  t: (key) => translations[DEFAULT_LANGUAGE][key] ?? key,
});

function normalizeLanguage(value) {
  return value === "en" ? "en" : DEFAULT_LANGUAGE;
}

function initialLanguage() {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  const stored = window.localStorage?.getItem(LANGUAGE_STORAGE_KEY);
  if (stored) return normalizeLanguage(stored);
  const browser = window.navigator?.language?.toLowerCase() ?? "";
  return browser.startsWith("en") ? "en" : DEFAULT_LANGUAGE;
}

function useI18n() {
  return useContext(I18nContext);
}

// Ordem oficial das colunas do Kanban:
//   Linha 1: Backlog · Todo · In Progress · Blocked  (fluxo principal)
//   Linha 2: Triage · Review · Done                  (estados auxiliares)
const kanbanColumnOrder = [
  "Backlog", "Todo", "In Progress", "Blocked",
  "Triage", "Review", "Done",
];

function pathFromSeries(points) {
  if (!points?.length) return "";
  if (points.length === 1) return `M 0 130 L 720 130`;

  const max = Math.max(...points, 1);
  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * 720;
      const y = 230 - (point / max) * 190;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function pathFromSeriesWithMax(points, max) {
  if (!points?.length) return "";
  if (points.length === 1) return `M 0 130 L 720 130`;

  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * 720;
      const y = 230 - (point / Math.max(max, 1)) * 190;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function pointForIndex(values, index, max) {
  const safeIndex = Math.min(Math.max(index, 0), Math.max(values.length - 1, 0));
  if (!values.length) return { x: 0, y: 230 };
  if (values.length === 1) return { x: 360, y: 130 };
  return {
    x: (safeIndex / (values.length - 1)) * 720,
    y: 230 - (Number(values[safeIndex] || 0) / Math.max(max, 1)) * 190,
  };
}

function formatBucketLabel(bucket, fallback) {
  const raw = bucket?.label ?? bucket?.time ?? bucket?.hour ?? bucket?.date ?? bucket?.day ?? bucket?.bucket ?? fallback;
  if (!raw) return fallback;
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    }
  }
  return String(raw);
}

function chartRowsFromLines(labels, lines) {
  const pointCount = Math.max(1, labels.length, ...lines.map((line) => line.values?.length ?? 0));
  return Array.from({ length: pointCount }, (_, index) => {
    const row = { label: labels[index] ?? `ponto ${index + 1}` };
    lines.forEach((line) => {
      row[line.key] = Number(line.values?.[index] ?? 0);
    });
    return row;
  });
}

function OkamiAreaChart({
  className = "",
  labels = [],
  lines = [],
  formatValue = (value) => String(value),
  formatAxis = (value) => formatTokenValue(Number(value)).replace(" tokens", ""),
}) {
  const rows = useMemo(() => chartRowsFromLines(labels, lines), [labels, lines]);
  const pointCount = Math.max(1, rows.length);
  const normalizedLines = lines.map((line) => ({
    ...line,
    values: Array.from({ length: pointCount }, (_, index) => Number(rows[index]?.[line.key] ?? 0)),
  }));
  const max = Math.max(1, ...normalizedLines.flatMap((line) => line.values));
  const axisIndexes = pointCount <= 6
    ? rows.map((_, index) => index)
    : [0, Math.floor((pointCount - 1) / 2), pointCount - 1];
  const yTicks = [0, 0.5, 1].map((ratio) => ({
    y: 238 - ratio * 190,
    label: formatAxis(max * ratio),
  }));

  return (
    <div className={`okami-chart ${className}`.trim()}>
      <svg className="okami-chart-svg" viewBox="0 0 780 270" role="img" aria-label="Grafico de uso">
        <defs>
          {normalizedLines.map((line) => (
            <linearGradient id={`chart-${line.key}`} x1="0" x2="0" y1="0" y2="1" key={line.key}>
              <stop offset="0%" stopColor={line.color} stopOpacity="0.28" />
              <stop offset="74%" stopColor={line.color} stopOpacity="0.04" />
              <stop offset="100%" stopColor={line.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        <g transform="translate(44 8)">
          {[48, 96, 144, 192, 230].map((y) => (
            <line className="okami-chart-grid" key={y} x1="0" x2="720" y1={y} y2={y} />
          ))}
          {yTicks.map((tick) => (
            <text className="okami-chart-axis-label" key={tick.y} x="-10" y={tick.y} textAnchor="end">{tick.label}</text>
          ))}
          {axisIndexes.map((index) => {
            const x = pointCount === 1 ? 0 : (index / (pointCount - 1)) * 720;
            return <text className="okami-chart-axis-label" key={`${rows[index]?.label}-${index}`} x={x} y="258" textAnchor="middle">{rows[index]?.label}</text>;
          })}
          {normalizedLines.map((line) => {
            const path = pathFromSeriesWithMax(line.values, max);
            const areaPath = `${path} L 720 230 L 0 230 Z`;
            const lastValue = line.values.at(-1) ?? 0;
            const lastPoint = pointForIndex(line.values, line.values.length - 1, max);
            return (
              <g key={line.key}>
                <path d={areaPath} fill={`url(#chart-${line.key})`} />
                <path className="okami-chart-line" d={path} stroke={line.color} />
                <circle cx={lastPoint.x} cy={lastPoint.y} r="5" fill="#06070b" stroke={line.color} strokeWidth="3" />
                <text className="okami-chart-value" x={Math.min(710, lastPoint.x + 10)} y={Math.max(18, lastPoint.y - 8)}>
                  {line.label}: {formatValue(lastValue, line)}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

function MiniBars({ values }) {
  const max = Math.max(...values, 1);
  return (
    <div className="mini-bars" aria-hidden="true">
      {values.map((value, index) => (
        <span key={`${value}-${index}`} style={{ height: `${Math.max(8, (value / max) * 100)}%` }}></span>
      ))}
    </div>
  );
}

function Sparkline({ values }) {
  const path = pathFromSeries(values);
  return (
    <svg className="sparkline" viewBox="0 0 720 260" preserveAspectRatio="none" aria-hidden="true">
      <path className="grid-line" d="M0 130H720" />
      <path className="line cyan" d={path} />
    </svg>
  );
}

function StatList({ items }) {
  return (
    <div className="stat-list">
      {items.map((item) => (
        <div key={item.name ?? item.label}>
          <span>{item.name ?? item.label}</span>
          <b>{item.value}</b>
        </div>
      ))}
    </div>
  );
}

function formatCurrency(value) {
  return `$${Math.round(Number(value) || 0)}`;
}

function formatCompactValue(value) {
  const number = Number(value) || 0;
  if (number >= 1_000_000_000) return `${(number / 1_000_000_000).toFixed(1)}B`;
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M`;
  if (number >= 1_000) return `${(number / 1_000).toFixed(1)}k`;
  return String(Math.round(number));
}

function formatTokenValue(value) {
  if (typeof value === "string") return value;
  const number = Number(value) || 0;
  if (number >= 1_000_000_000) return `${(number / 1_000_000_000).toFixed(1)}B tokens`;
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M tokens`;
  if (number >= 1_000) return `${(number / 1_000).toFixed(1)}k tokens`;
  return `${number} tokens`;
}

// Constrói uma janela contínua de N dias de calendário terminando hoje (ou no
// dia mais recente com dados, o que for maior). Dias sem registro entram com 0.
// Isso garante que 7d/30d sempre mostrem N pontos — antes o 7d agrupava só os
// dias de calendário existentes (poucos), parecendo "menos dados" que o 24h,
// que agrupa por hora-do-dia (até 24 baldes somando todo o histórico).
function buildDailyWindow(days, windowSize) {
  const byBucket = new Map((days ?? []).filter((day) => day?.bucket).map((day) => [day.bucket, day]));
  const buckets = [...byBucket.keys()].sort();
  const todayKey = new Date().toISOString().slice(0, 10);
  const latestKey = buckets.at(-1);
  const endKey = latestKey && latestKey > todayKey ? latestKey : todayKey;
  const end = new Date(`${endKey}T00:00:00Z`);
  const window = [];
  for (let offset = windowSize - 1; offset >= 0; offset -= 1) {
    const day = new Date(end);
    day.setUTCDate(day.getUTCDate() - offset);
    const key = day.toISOString().slice(0, 10);
    window.push(byBucket.get(key) ?? { bucket: key, input_tokens: 0, output_tokens: 0, tokens: 0, sessions: 0 });
  }
  return window;
}

const RANGE_LABELS = {
  "1h": "ultima 1h",
  "24h": "ultimas 24h",
  "7d": "ultimos 7 dias",
  "30d": "ultimos 30 dias",
};

function tokensToChartUnit(value) {
  const number = Number(value) || 0;
  if (number <= 0) return 0;
  return Math.max(1, Math.round(number / 1000));
}

function seriesFromRangeData(rangeData, range) {
  if (!rangeData || !Array.isArray(rangeData.points)) return null;
  const points = rangeData.points;
  const label = rangeData.label ?? RANGE_LABELS[range] ?? range;
  const totalTokens = Number(rangeData.tokens ?? points.reduce((sum, point) => sum + Number(point.tokens || 0), 0));
  if (!points.length) {
    return {
      input: [0],
      output: [0],
      total: [0],
      labels: ["agora"],
      label,
      totalTokens,
      totalInputTokens: Number(rangeData.input_tokens ?? 0),
      totalOutputTokens: Number(rangeData.output_tokens ?? 0),
    };
  }
  return {
    input: points.map((point) => tokensToChartUnit(point.input_tokens)),
    output: points.map((point) => tokensToChartUnit(point.output_tokens)),
    total: points.map((point) => tokensToChartUnit(point.tokens)),
    labels: points.map((point) => formatBucketLabel(point, point.bucket)),
    label,
    totalTokens,
    totalInputTokens: Number(rangeData.input_tokens ?? points.reduce((sum, point) => sum + Number(point.input_tokens || 0), 0)),
    totalOutputTokens: Number(rangeData.output_tokens ?? points.reduce((sum, point) => sum + Number(point.output_tokens || 0), 0)),
  };
}

function seriesFromAnalytics(data, range) {
  const analytics = data.hermes?.analytics ?? {};
  const rangeSeries = seriesFromRangeData(analytics.ranges?.[range], range);
  if (rangeSeries) return rangeSeries;
  if (range === "1h") {
    const lastHour = (analytics.hours ?? []).slice(-1);
    const fallbackInput = data.tokenSeries.input?.slice(-2) ?? [];
    const fallbackOutput = data.tokenSeries.output?.slice(-2) ?? [];
    const hasRealPoint = lastHour.length > 0;
    return {
      input: hasRealPoint ? [0, Math.max(1, Math.round(Number(lastHour[0].input_tokens || 0) / 1000))] : fallbackInput,
      output: hasRealPoint ? [0, Math.max(1, Math.round(Number(lastHour[0].output_tokens || 0) / 1000))] : fallbackOutput,
      labels: hasRealPoint ? ["inicio", formatBucketLabel(lastHour[0], "ultima 1h")] : ["inicio", "agora"],
      label: "ultima 1h",
    };
  }
  if (range === "7d" || range === "30d") {
    const windowSize = range === "7d" ? 7 : 30;
    const days = buildDailyWindow(analytics.days, windowSize);
    const hasAnyData = (analytics.days ?? []).length > 0;
    if (!hasAnyData) {
      return {
        input: data.tokenSeries.input,
        output: data.tokenSeries.output,
        labels: Array.from({ length: data.tokenSeries.input?.length ?? 0 }, (_, index) => `d-${(data.tokenSeries.input?.length ?? 0) - index - 1}`),
        label: range === "7d" ? "ultimos 7 dias" : "ultimos 30 dias",
      };
    }
    return {
      input: days.map((day) => Math.max(0, Math.round(Number(day.input_tokens || 0) / 1000))),
      output: days.map((day) => Math.max(0, Math.round(Number(day.output_tokens || 0) / 1000))),
      labels: days.map((day) => formatBucketLabel(day, day.bucket)),
      label: range === "7d" ? "ultimos 7 dias" : "ultimos 30 dias",
    };
  }
  const hours = (analytics.hours ?? []).slice(-24);
  const hasEnoughHours = hours.length > 1;
  const fallbackLength = data.tokenSeries.input?.length ?? 0;
  return {
    input: hasEnoughHours ? hours.map((hour) => Math.max(1, Math.round(Number(hour.input_tokens || 0) / 1000))) : data.tokenSeries.input,
    output: hasEnoughHours ? hours.map((hour) => Math.max(1, Math.round(Number(hour.output_tokens || 0) / 1000))) : data.tokenSeries.output,
    labels: hasEnoughHours
      ? hours.map((hour, index) => formatBucketLabel(hour, `h-${hours.length - index - 1}`))
      : Array.from({ length: fallbackLength }, (_, index) => `ponto ${index + 1}`),
    label: "ultimas 24h",
  };
}

function usageSeriesForPeriod(subscriptions, period) {
  if (period === "Diario") {
    return subscriptions.map((item) => Number(item.dailyTokenSeries?.at(-1) ?? item.dailySeries?.at(-1) ?? item.dailyUsed ?? 0));
  }
  if (period === "Mensal") {
    return subscriptions.map((item) => Number(item.tokenRaw ?? (item.tokenUnits ?? 0) * 1000));
  }
  const maxSeriesLength = Math.max(7, ...subscriptions.map((item) => item.dailyTokenSeries?.length ?? item.dailySeries?.length ?? 0));
  return Array.from({ length: maxSeriesLength }, (_, dayIndex) =>
    subscriptions.reduce((sum, item) => sum + Number(item.dailyTokenSeries?.[dayIndex] ?? item.dailySeries?.[dayIndex] ?? 0), 0),
  );
}

function usageLabelsForPeriod(subscriptions, period, usageRows) {
  if (period === "Semanal") {
    const maxSeriesLength = Math.max(7, ...subscriptions.map((item) => item.dailyTokenSeries?.length ?? item.dailySeries?.length ?? 0));
    return Array.from({ length: maxSeriesLength }, (_, index) => {
      const offset = maxSeriesLength - index - 1;
      if (offset === 0) return "hoje";
      if (offset === 1) return "ontem";
      return `d-${offset}`;
    });
  }
  return usageRows.map((item) => item.name);
}

function periodTokenTotal(subscriptions, period) {
  if (period === "Diario") {
    return subscriptions.reduce((sum, item) => sum + Number(item.dailyTokenSeries?.at(-1) ?? item.dailySeries?.at(-1) ?? item.dailyUsed ?? 0), 0);
  }
  if (period === "Mensal") {
    return subscriptions.reduce((sum, item) => sum + Number(item.tokenRaw ?? (item.tokenUnits ?? 0) * 1000), 0);
  }
  return subscriptions.reduce((sum, item) => {
    const weeklyTokens = (item.dailyTokenSeries ?? item.dailySeries)?.reduce((total, value) => total + Number(value || 0), 0);
    return sum + Number(weeklyTokens ?? item.weeklyUsed ?? 0);
  }, 0);
}

function findAgentActiveTask(agent, tasks = []) {
  if (!agent) return null;
  const agentId = String(agent.id ?? "").toLowerCase();
  const agentName = String(agent.name ?? "").toLowerCase();
  const currentTask = String(agent.currentTask ?? "").toLowerCase();
  const usableTasks = tasks.filter((task) => !/(done|complete|completed|closed)/i.test(String(task.status ?? task.meta ?? "")));
  const matchesAgent = (task) => {
    const owner = String(task.owner ?? task.assignee ?? task.raw?.assignee ?? "").toLowerCase();
    const title = String(task.title ?? "").toLowerCase();
    const matchesOwner = owner && (
      owner.includes(agentId)
      || agentId.includes(owner)
      || owner.includes(agentName)
      || agentName.includes(owner)
    );
    const matchesTitle = currentTask && title && (
      title.includes(currentTask.slice(0, 30))
      || currentTask.includes(title.slice(0, 30))
    );
    return matchesOwner || matchesTitle;
  };
  return usableTasks.find(matchesAgent)
    ?? (agent.tasks ?? []).find((task) => !/(done|complete|completed|closed)/i.test(String(task.status ?? "")))
    ?? null;
}

function actionLabel(action) {
  const labels = {
    cancelar: "cancelar",
    rebaixar: "rebaixar",
    avaliar: "avaliar",
    monitorar: "monitorar",
  };
  return labels[action] ?? action ?? "monitorar";
}

function actionTone(action) {
  if (action === "cancelar") return "danger";
  if (action === "rebaixar" || action === "avaliar") return "warn";
  return "ok";
}

function DetailModal({ title, eyebrow, children, onClose }) {
  const { t } = useI18n();
  useEffect(() => {
    if (!title) return;
    const onKey = (event) => { if (event.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [title, onClose]);

  if (!title) return null;
  return (
    <div className="modal-backdrop ok-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="detail-modal ok-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <p className="ok-section-label">
              <span>{eyebrow}</span>
            </p>
            <h3>{title}</h3>
          </div>
          <button className="ok-btn ok-btn--ghost ok-btn--sm" type="button" onClick={onClose}>
            {t("button.close")} ✕
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function ObjectFacts({ data }) {
  return (
    <div className="object-facts">
      {Object.entries(data).map(([key, value]) => (
        <div className={`fact-${key.replaceAll("_", "-")}`} key={key}>
          <span>{key}</span>
          <b>{Array.isArray(value) ? value.join(", ") : String(value ?? "-")}</b>
        </div>
      ))}
    </div>
  );
}

function summarizeRecord(record) {
  if (!record || typeof record !== "object") return String(record ?? "");
  return record.message
    ?? record.body
    ?? record.comment
    ?? record.content
    ?? record.summary
    ?? record.result
    ?? record.event
    ?? record.status
    ?? JSON.stringify(record);
}

function recordTime(record) {
  const raw = record?.created_at ?? record?.updated_at ?? record?.started_at ?? record?.timestamp ?? record?.time;
  if (!raw) return "";
  const numeric = Number(raw);
  if (Number.isFinite(numeric) && numeric > 10_000) return new Date(numeric * 1000).toLocaleString("pt-BR");
  return String(raw);
}

function AgentMonitor({ agent, task }) {
  const events = agent?.workEvents ?? [];
  const subagents = agent?.subagents ?? [];
  const activeTask = task ?? agent?.tasks?.find((item) => !/(done|complete|completed|closed)/i.test(String(item.status ?? "")));
  return (
    <div className="agent-monitor">
      <div className="agent-monitor-head">
        <ObjectFacts data={{
          profile: agent?.id,
          tarefa: activeTask?.title ?? agent?.currentTask,
          status_tarefa: activeTask?.status ?? activeTask?.meta ?? "sem tarefa vinculada",
          workspace: agent?.workspace,
          progresso: `${agent?.progress ?? 0}%`,
        }} />
      </div>
      <div className="monitor-task-focus">
        <span>tarefa ativa</span>
        <h3>{activeTask?.title ?? agent?.currentTask ?? "Sem tarefa ativa vinculada"}</h3>
        <p>{activeTask?.description ?? activeTask?.body ?? activeTask?.raw?.description ?? activeTask?.raw?.body ?? "O Hermes nao retornou descricao detalhada para esta tarefa no snapshot atual."}</p>
        <div>
          <b>{activeTask?.status ?? activeTask?.meta ?? agent?.status ?? "idle"}</b>
          <b>{activeTask?.owner ?? activeTask?.assignee ?? agent?.name}</b>
          <b>{activeTask?.priority ?? "sem prioridade"}</b>
        </div>
      </div>
      <div className="agent-monitor-grid">
        <section className="monitor-stream">
          <div className="panel-title compact">
            <h3>Processamento</h3>
            <span>{events.length ? "state.db messages" : "sem eventos recentes"}</span>
          </div>
          <div className="work-event-list">
            {events.length ? events.map((event) => (
              <article key={event.id}>
                <span>{event.type}</span>
                <p>{event.message}</p>
                <small>{event.role}{event.sessionId ? ` · ${String(event.sessionId).slice(0, 12)}` : ""}</small>
              </article>
            )) : agent?.logs?.map((log) => (
              <article key={log}>
                <span>log</span>
                <p>{log}</p>
                <small>profile aggregate</small>
              </article>
            ))}
          </div>
        </section>
        <aside className="monitor-side">
          <div className="monitor-frame">
            <div className="monitor-bar"><span>{agent?.monitorTitle}</span><b>live</b></div>
            <pre>{agent?.monitorLines?.join("\n")}</pre>
          </div>
          <div className="panel-title compact">
            <h3>Subagentes</h3>
            <span>{subagents.length}</span>
          </div>
          <div className="subagent-list compact-list">
            {subagents.length ? subagents.map((child) => (
              <article key={child.id}>
                <strong>{child.name}</strong>
                <span>{child.status} · {child.model}</span>
                <p>{child.task}</p>
              </article>
            )) : <p>Nenhum subagente recente detectado.</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}

function PixelAgentMonitor({ agent, tasks = [] }) {
  const events = (agent?.workEvents ?? []).slice(0, 12);
  const logs = (agent?.logs ?? []).slice(0, 8);
  const subagents = agent?.subagents ?? [];
  const monitorLines = agent?.monitorLines ?? [];
  return (
    <div className="pixel-monitor-detail">
      {/* COLUNA ESQUERDA: Processamento (alto) */}
      <section className="pixel-monitor-card pixel-card--events">
        <div className="panel-title compact">
          <h3>Processamento</h3>
          <span>{events.length ? `${events.length} eventos` : "logs do perfil"}</span>
        </div>
        <div className="work-event-list pixel-work-list">
          {events.length ? events.map((event, idx) => {
            const type = String(event.type ?? "event").toLowerCase();
            const msg = String(event.message ?? "");
            const looksMarkdown = msg.includes("\n") || /[`*#-]/.test(msg);
            return (
              <article key={event.id ?? idx} data-event-type={type}>
                <header className="work-event__head">
                  <span className="work-event__type">{event.type}</span>
                  {event.role ? <span className="work-event__role">{event.role}</span> : null}
                </header>
                <div className="work-event__body">
                  {looksMarkdown ? <MarkdownLite source={msg} /> : <p>{msg}</p>}
                </div>
                <footer className="work-event__foot">
                  {event.sessionId ? (
                    <code className="work-event__session">sid:{String(event.sessionId).slice(0, 12)}</code>
                  ) : null}
                  {event.timestamp || event.created_at ? (
                    <small>{recordTime(event) || ""}</small>
                  ) : null}
                </footer>
              </article>
            );
          }) : logs.map((log, i) => (
            <article key={i} data-event-type="log">
              <header className="work-event__head">
                <span className="work-event__type">log</span>
              </header>
              <div className="work-event__body"><p>{log}</p></div>
              <footer className="work-event__foot">
                <small>profile aggregate</small>
              </footer>
            </article>
          ))}
        </div>
      </section>

      {/* COLUNA DIREITA TOPO: Monitor terminal */}
      <section className="pixel-monitor-card pixel-card--monitor">
        <div className="panel-title compact">
          <h3>Monitor</h3>
          <span>{agent?.monitorTitle ?? "state.db"}</span>
        </div>
        <div className="ok-terminal pixel-terminal-block">
          <div className="ok-terminal__head">
            <span className="ok-terminal__dot ok-terminal__dot--red" aria-hidden="true" />
            <span className="ok-terminal__dot ok-terminal__dot--yellow" aria-hidden="true" />
            <span className="ok-terminal__dot ok-terminal__dot--green" aria-hidden="true" />
            <span className="ok-terminal__title">{agent?.monitorTitle ?? "state.db"}</span>
            <span className="ok-terminal__status">LIVE</span>
          </div>
          <div className="ok-terminal__body">
            {monitorLines.length ? monitorLines.map((line, i) => (
              <span className="ok-terminal__line ok-terminal__line--out" key={i}>{line}</span>
            )) : <span className="ok-terminal__line ok-terminal__line--out">aguardando stream do agente…</span>}
            <span className="ok-terminal__cursor" aria-hidden="true" />
          </div>
        </div>
      </section>

      {/* COLUNA DIREITA MEIO: Subagentes */}
      <section className="pixel-monitor-card pixel-card--subagents">
        <div className="panel-title compact">
          <h3>Subagentes</h3>
          <span>{subagents.length}</span>
        </div>
        <div className="subagent-grid">
          {subagents.length ? subagents.map((child, i) => (
            <article key={child.id ?? i} className="subagent-card" data-idx={i}>
              <header className="subagent-card__head">
                <strong>{child.name}</strong>
                <span className={`ok-status-badge ${
                  /active|running/i.test(child.status ?? "")
                    ? "ok-status-badge--online"
                    : "ok-status-badge--operational"
                }`}>{child.status ?? "idle"}</span>
              </header>
              <dl className="subagent-card__meta">
                {child.model ? <><dt>model</dt><dd>{child.model}</dd></> : null}
                {child.tokens ? <><dt>tokens</dt><dd>{child.tokens}</dd></> : null}
              </dl>
              {child.task ? <p className="subagent-card__task">{child.task}</p> : null}
            </article>
          )) : (
            <div className="ok-empty">
              <span className="ok-empty__icon" aria-hidden="true">∅</span>
              <span className="ok-empty__title">Sem subagentes</span>
              <span className="ok-empty__desc">Nenhum subagente recente detectado.</span>
            </div>
          )}
        </div>
      </section>

      {/* COLUNA DIREITA BASE: Kanban vinculado */}
      <section className="pixel-monitor-card pixel-card--kanban">
        <div className="panel-title compact">
          <h3>Kanban vinculado</h3>
          <span>{tasks.length}</span>
        </div>
        <div className="subagent-grid">
          {tasks.length ? tasks.map((task, i) => (
            <article key={task.id ?? task.title ?? i} className="subagent-card" data-idx={i}>
              <header className="subagent-card__head">
                <strong>{task.title}</strong>
                <span className="ok-status-badge ok-status-badge--beta">
                  {task.status ?? task.meta ?? "ativo"}
                </span>
              </header>
              <dl className="subagent-card__meta">
                <dt>owner</dt><dd>{task.owner ?? agent?.name}</dd>
                {task.id ? <><dt>id</dt><dd><code>{String(task.id).slice(0, 12)}</code></dd></> : null}
              </dl>
              {(task.description ?? task.body ?? task.raw?.description) ? (
                <p className="subagent-card__task">
                  {task.description ?? task.body ?? task.raw?.description}
                </p>
              ) : null}
            </article>
          )) : (
            <div className="ok-empty">
              <span className="ok-empty__icon" aria-hidden="true">⌧</span>
              <span className="ok-empty__title">Sem tarefa ativa</span>
              <span className="ok-empty__desc">Nenhum card do Kanban vinculado a esse agente.</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Sidebar({ activeView, setActiveView, status, open, setOpen }) {
  const { t } = useI18n();
  const isHealthy = Boolean(status?.healthy);
  return (
    <aside className={`sidebar ${open ? "is-open" : ""}`} aria-label={t("button.openMenu")}>
      <div className="brand-row">
        <button
          className="brand"
          type="button"
          onClick={() => {
            setActiveView("overview");
            setOpen(false);
          }}
          aria-label="OKAMI Mission Control"
        >
          <span className="brand-mark">
            <img src="https://okami-site.msant262.workers.dev/assets/okami-logo.png" alt="" />
          </span>
          <span>
            <strong>OKAMI</strong>
            <small>Mission Control</small>
          </span>
        </button>
        <button className="sidebar-close" type="button" onClick={() => setOpen(false)} aria-label={t("button.closeMenu")}>
          ×
        </button>
      </div>

      <nav className="nav-groups" aria-label="Modulos">
        {(() => {
          let globalIdx = 0;
          return navGroups.map((group) => (
            <div className="nav-section" key={group.label}>
              <div className="nav-section__head">
                <span className="nav-section__bar" aria-hidden="true" />
                <span className="nav-section__label">{t(`nav.group.${group.label}`)}</span>
              </div>
              {group.items.map(([id, icon, label]) => {
                globalIdx += 1;
                const isActive = activeView === id;
                const num = String(globalIdx).padStart(2, "0");
                const accent = ITEM_ACCENTS[id] || "cyan";
                return (
                  <button
                    className={`nav-item ${isActive ? "is-active" : ""}`}
                    key={id}
                    data-accent={accent}
                    onClick={() => {
                      setActiveView(id);
                      setOpen(false);
                    }}
                    aria-current={isActive ? "page" : undefined}
                    type="button"
                  >
                    <span className="nav-item__num">{num}</span>
                    <span className="nav-item__icon" aria-hidden="true">{icon}</span>
                    <span className="nav-item__label">{t(`nav.${id}`) ?? label}</span>
                  </button>
                );
              })}
            </div>
          ));
        })()}
      </nav>

      <div
        className={`ok-status-badge side-status ${isHealthy ? "ok-status-badge--online" : "ok-status-badge--warning"}`}
        role="status"
        aria-live="polite"
      >
        <div className="side-status__text">
          <strong>{status?.label ?? (isHealthy ? "ONLINE" : "WARNING")}</strong>
          {status?.detail ? <small>{status.detail}</small> : null}
        </div>
      </div>
    </aside>
  );
}

function LanguageToggle() {
  const { language, setLanguage, t } = useI18n();
  return (
    <div className="language-toggle" aria-label={t("lang.selector")}>
      {[
        ["pt-BR", t("lang.pt")],
        ["en", t("lang.en")],
      ].map(([value, label]) => (
        <button
          className={language === value ? "is-active" : ""}
          key={value}
          onClick={() => setLanguage(value)}
          type="button"
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Topbar({ source, loading, lastSync, setOpen, setActiveView, onOpenGateway }) {
  const { language, t } = useI18n();
  const isLive = source === "api";
  const modeLabel = loading ? t("status.sync") : isLive ? t("status.online") : t("status.demo");
  return (
    <header className="topbar">
      <button id="menuToggle" className="mobile-menu" type="button" onClick={() => setOpen(true)} aria-label={t("button.openMenu")}>
        ☰
      </button>
      <div className="topbar__title">
        <p className="ok-section-label">
          <span className="ok-section-label__num">OKAMIOPS</span>
          <span aria-hidden="true">·</span>
          <span>AGENT ORCHESTRATION</span>
          <span aria-hidden="true">·</span>
          <span
            className={`ok-status-badge ${isLive ? "ok-status-badge--online" : "ok-status-badge--warning"}`}
            style={{ marginLeft: "var(--ok-s-2)" }}
          >
            {modeLabel}
          </span>
        </p>
        <h1 className="ok-hero-title">
          Mission <em>Control</em>
        </h1>
      </div>
      <div className="top-actions">
        <span className="sync-time">
          {lastSync ? new Date(lastSync).toLocaleTimeString(language) : "--:--"}
        </span>
        <LanguageToggle />
        <button className="ok-btn ok-btn--ghost" type="button" onClick={onOpenGateway}>
          Gateway
        </button>
        <button className="ok-btn ok-btn--primary" type="button" onClick={() => setActiveView("pixel")}>
          {t("button.newAgent")} →
        </button>
      </div>
    </header>
  );
}

function GatewayDetail({ data }) {
  const hermes = data.hermes ?? {};
  const gatewayHealth = data.overview?.serviceHealth?.find((item) => /gateway/i.test(item.name));
  const gatewayApp = data.apps?.find((app) => /gateway/i.test(`${app.name} ${app.detail} ${app.url}`));
  const gatewayRoutes = (data.hermes?.routes ?? [])
    .filter((route) => /gateway|status|logs|proxy/i.test(`${route.group} ${route.path} ${route.purpose}`))
    .slice(0, 8);
  const gatewayEvents = (data.activity ?? [])
    .filter((event) => /gateway|proxy|fallback|openrouter|whatsapp/i.test(`${event.actor} ${event.message}`))
    .slice(0, 6);
  const liveEvents = (data.liveEvents ?? []).slice(0, 4);
  const analytics = hermes.analytics ?? {};
  const platforms = (analytics.platforms ?? []).slice(0, 5);

  return (
    <div className="gateway-detail">
      <ObjectFacts data={{
        status: gatewayHealth?.status ?? hermes.sshStatus?.status ?? data.status?.label,
        health: gatewayHealth ? `${gatewayHealth.value}%` : "-",
        endpoint_publico: hermes.publicEndpoint ?? gatewayApp?.url ?? "privado via SSH",
        dashboard_local: hermes.localDashboard ?? "sem endpoint publico",
        ssh: `${hermes.sshUser ?? "root"}@${hermes.sshHost ?? "nao configurado"}:${hermes.sshPort ?? 22}`,
        backend: hermes.terminalBackend ?? "ssh",
        gateway_pid: hermes.gatewayPidPath ?? "~/.hermes/gateway.pid",
        logs: hermes.logsPath ?? "~/.hermes/logs",
      }} />

      <div className="gateway-grid">
        <article className="panel gateway-card">
          <div className="panel-title"><h3>Aplicacao</h3><span>registro atual</span></div>
          {gatewayApp ? (
            <ObjectFacts data={{
              nome: gatewayApp.name,
              url: gatewayApp.url,
              status: gatewayApp.status,
              uptime: `${gatewayApp.uptime ?? "-"}%`,
              ambiente: gatewayApp.env,
            }} />
          ) : (
            <p>Nenhuma aplicacao de gateway cadastrada ainda em Apps.</p>
          )}
        </article>

        <article className="panel gateway-card">
          <div className="panel-title"><h3>Rotas</h3><span>Hermes gateway</span></div>
          <div className="gateway-route-list">
            {gatewayRoutes.length ? gatewayRoutes.map((route) => (
              <div key={`${route.method}-${route.path}`}>
                <span>{route.method}</span>
                <b>{route.path}</b>
                <small>{route.purpose}</small>
              </div>
            )) : <p>Nenhuma rota de gateway foi retornada pelo estado atual.</p>}
          </div>
        </article>

        <article className="panel gateway-card">
          <div className="panel-title"><h3>Fluxo</h3><span>plataformas / sessoes</span></div>
          <div className="gateway-route-list">
            {platforms.length ? platforms.map((platform) => (
              <div key={platform.source}>
                <span>{platform.source}</span>
                <b>{platform.sessions ?? 0} sessions</b>
                <small>{formatTokenValue(platform.tokens ?? 0)} · {platform.messages ?? 0} mensagens</small>
              </div>
            )) : <p>Sem breakdown de plataformas no snapshot atual.</p>}
          </div>
        </article>

        <article className="panel gateway-card">
          <div className="panel-title"><h3>Eventos</h3><span>atividade recente</span></div>
          <ul className="gateway-events">
            {(gatewayEvents.length ? gatewayEvents : liveEvents).map((event, index) => (
              <li key={`${event.actor ?? event.time}-${index}`}>
                <span>{event.actor ?? event.time ?? "gateway"}</span>
                <p>{event.message}</p>
                <b>{event.status ?? event.tone ?? "live"}</b>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </div>
  );
}

function SectionHead({ eyebrow, title, children, className = "" }) {
  // Detect "§XX / label" or "§XX · label" pattern → split em número + label
  // pra renderizar como label do design system ("── §03 · DIFERENCIAIS").
  const match = typeof eyebrow === "string"
    ? eyebrow.match(/^(§\s*\d+|\d+)\s*[\/·-]\s*(.+)$/i)
    : null;
  const num = match?.[1]?.replace(/\s+/g, "");
  const label = match?.[2] ?? eyebrow;

  return (
    <div className={`section-head ${className}`.trim()}>
      <div>
        <p className="ok-section-label">
          {num ? <span className="ok-section-label__num">{num}</span> : null}
          {num ? <span aria-hidden="true">·</span> : null}
          <span>{label}</span>
        </p>
        <h2 className="ok-section-title">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Overview({ data }) {
  const { t } = useI18n();
  const [range, setRange] = useState("24h");
  const selectedSeries = useMemo(() => seriesFromAnalytics(data, range), [data, range]);
  const periodTokens = selectedSeries.totalTokens
    ?? [...selectedSeries.input, ...selectedSeries.output].reduce((sum, value) => sum + Number(value || 0), 0) * 1000;
  const periodInputTokens = selectedSeries.totalInputTokens
    ?? selectedSeries.input.reduce((sum, value) => sum + Number(value || 0), 0) * 1000;
  const periodOutputTokens = selectedSeries.totalOutputTokens
    ?? selectedSeries.output.reduce((sum, value) => sum + Number(value || 0), 0) * 1000;
  const rangeLabel = t(`range.${range}`);
  const overviewMetrics = useMemo(() => data.metrics.map((metric) => {
    const key = String(metric.label ?? "").toLowerCase();
    if (key.includes("tokens")) {
      return {
        ...metric,
        label: t("metric.tokens"),
        value: formatCompactValue(periodTokens),
        delta: `${range.toUpperCase()} · ${formatCompactValue(periodInputTokens)} in · ${formatCompactValue(periodOutputTokens)} out`,
      };
    }
    if (key === "sessions") {
      return {
        ...metric,
        label: t("metric.sessions"),
        delta: String(metric.delta ?? "").replace(/mensagens/i, t("metric.messages")),
      };
    }
    if (key === "kanban") {
      return {
        ...metric,
        label: t("metric.kanban"),
        delta: String(metric.delta ?? "").replace(/bloqueios/i, t("metric.blocks")),
      };
    }
    if (key === "ssh") {
      return { ...metric, label: t("metric.ssh") };
    }
    return metric;
  }), [data.metrics, periodInputTokens, periodOutputTokens, periodTokens, range, t]);

  return (
    <section className="view is-active">
      <SectionHead eyebrow={`§01 / ${t("overview.eyebrow")}`} title={t("overview.title")}>
        <div className="filters" aria-label={t("overview.periodFilters")}>
          {["1h", "24h", "7d", "30d"].map((item) => (
            <button className={range === item ? "is-active" : ""} onClick={() => setRange(item)} type="button" key={item}>{item}</button>
          ))}
        </div>
      </SectionHead>

      <div className="metric-grid">
        {overviewMetrics.map((metric) => (
          <article className={`metric-card ${metric.hot ? "hot" : ""}`} key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.delta}</small>
          </article>
        ))}
        <article className="metric-card period-card">
          <span>{range}</span>
          <strong>{formatTokenValue(periodTokens)}</strong>
          <small>{rangeLabel}</small>
        </article>
      </div>

      <div className="dashboard-grid">
        <article className="panel usage-panel">
          <div className="panel-title">
            <h3>{t("overview.tokens.title")}</h3>
            <span>{rangeLabel} · {t("overview.tokens.subtitle")}</span>
          </div>
          <OkamiAreaChart
            className="line-chart"
            labels={selectedSeries.labels}
            lines={[
              { key: "input", label: "input", values: selectedSeries.input, color: "var(--ok-orange)" },
              { key: "output", label: "output", values: selectedSeries.output, color: "var(--ok-cyan)" },
              { key: "total", label: "total", values: selectedSeries.total ?? selectedSeries.input.map((value, index) => Number(value || 0) + Number(selectedSeries.output[index] || 0)), color: "var(--ok-magenta)" },
            ]}
            formatValue={(value) => formatTokenValue(value * 1000)}
            formatAxis={(value) => formatTokenValue(Number(value) * 1000).replace(" tokens", "")}
          />
        </article>

        <article className="panel">
          <div className="panel-title">
            <h3>{t("overview.models.title")}</h3>
            <span>{t("overview.models.subtitle")}</span>
          </div>
          <div className="model-list">
            {data.models.map((model) => (
              <div key={model.name}>
                <span>{model.name}</span>
                <b>{model.share}%</b>
                <i style={{ "--w": `${model.share}%` }}></i>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-title">
            <h3>{t("overview.activity.title")}</h3>
            <span>{t("overview.activity.subtitle")}</span>
          </div>
          <ol className="activity-list">
            {data.activity.map((event) => (
              <li key={`${event.actor}-${event.message}`}>
                <b>{event.actor}</b>
                <span>{event.message}</span>
                <em className={event.tone === "warn" ? "warn" : ""}>{event.status}</em>
              </li>
            ))}
          </ol>
        </article>

        <article className="panel">
          <div className="panel-title">
            <h3>{t("overview.skills.title")}</h3>
            <span>{t("overview.skills.subtitle")}</span>
          </div>
          <div className="skill-list">
            {data.skills.map((skill) => <span key={skill}>{skill}</span>)}
          </div>
        </article>
      </div>

      <div className="ops-grid">
        <article className="panel">
          <div className="panel-title">
            <h3>{t("overview.health.title")}</h3>
            <span>{t("overview.health.subtitle")}</span>
          </div>
          <div className="health-list">
            {data.overview.serviceHealth.map((service) => (
              <div className={`health-row tone-${service.status}`} key={service.name}>
                <span>{service.name}</span>
                <b>{service.value}%</b>
                <i style={{ width: `${service.value}%` }}></i>
              </div>
            ))}
          </div>
        </article>
        <article className="panel">
          <div className="panel-title">
            <h3>{t("overview.queue.title")}</h3>
            <span>{t("overview.queue.subtitle")}</span>
          </div>
          <StatList items={data.overview.queue} />
        </article>
        <article className="panel">
          <div className="panel-title">
            <h3>{t("overview.incidents.title")}</h3>
            <span>{t("overview.incidents.subtitle")}</span>
          </div>
          <div className="decision-list">
            {data.overview.incidents.map((incident) => (
              <article key={incident.title}>
                <div>
                  <strong>{incident.severity} · {incident.owner}</strong>
                  <span>{incident.eta}</span>
                </div>
                <p>{incident.title}</p>
              </article>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

function Usage({ data }) {
  const { t } = useI18n();
  const subscriptions = data.subscriptions ?? [];
  const [period, setPeriod] = useState("Semanal");
  const totals = useMemo(() => {
    return subscriptions.reduce(
      (acc, item) => ({
        monthlyCost: acc.monthlyCost + item.monthlyCost,
        dailyUsed: acc.dailyUsed + item.dailyUsed,
        weeklyUsed: acc.weeklyUsed + item.weeklyUsed,
        monthlyForecast: acc.monthlyForecast + item.monthlyForecast,
      }),
      { monthlyCost: 0, dailyUsed: 0, weeklyUsed: 0, monthlyForecast: 0 },
    );
  }, [subscriptions]);

  const savings = useMemo(() => {
    return subscriptions
      .filter((item) => item.action === "cancelar" || item.action === "rebaixar")
      .reduce((total, item) => total + (item.action === "cancelar" ? item.monthlyCost : item.monthlyCost * 0.4), 0);
  }, [subscriptions]);
  const primaryCut = subscriptions.find((item) => item.action === "cancelar");
  const periodSeries = useMemo(() => usageSeriesForPeriod(subscriptions, period), [subscriptions, period]);
  const periodTokens = useMemo(() => periodTokenTotal(subscriptions, period), [subscriptions, period]);
  const usageRows = useMemo(() => subscriptions
    .slice()
    .sort((left, right) => Number(right.tokenRaw || 0) - Number(left.tokenRaw || 0)), [subscriptions]);
  const periodLabels = useMemo(() => usageLabelsForPeriod(subscriptions, period, usageRows), [subscriptions, period, usageRows]);
  const heaviest = usageRows[0];
  const inactiveCount = subscriptions.filter((item) => !Number(item.tokenRaw || 0)).length;
  const totalTokens = usageRows.reduce((sum, item) => sum + Number(item.tokenRaw || 0), 0) || 1;
  const bestCut = usageRows
    .filter((item) => item.action === "cancelar" || !Number(item.tokenRaw || 0))
    .sort((left, right) => right.monthlyCost - left.monthlyCost)[0];

  return (
    <section className="view is-active">
      <SectionHead eyebrow={`§02 / ${t("section.usage.eyebrow")}`} title={t("section.usage.title")}>
        <div className="filters" aria-label="Filtros de uso">
          {["Diario", "Semanal", "Mensal"].map((item) => (
            <button className={period === item ? "is-active" : ""} onClick={() => setPeriod(item)} type="button" key={item}>{item}</button>
          ))}
        </div>
      </SectionHead>

      <div className="usage-v3">
        <article className="usage-brief panel">
          <div>
            <span>leitura do Hermes</span>
            <strong>{heaviest ? `${heaviest.name} concentra ${Math.round((Number(heaviest.tokenRaw || 0) / totalTokens) * 100)}% dos tokens` : "Sem consumo real"}</strong>
            <p>{primaryCut ? `${inactiveCount} assinatura(s) sem uso detectado no Hermes. Corte mais obvio: ${bestCut?.name ?? primaryCut.name}.` : "Nao ha corte urgente, mas o uso continua concentrado em poucas assinaturas."}</p>
          </div>
          <div className="usage-brief-metrics">
            <div><span>mensal fixo</span><b>{formatCurrency(totals.monthlyCost)}</b></div>
            <div><span>forecast</span><b>{formatCurrency(totals.monthlyForecast)}</b></div>
            <div><span>{period}</span><b>{formatTokenValue(periodTokens)}</b></div>
            <div><span>economia</span><b>{formatCurrency(savings)}</b></div>
          </div>
        </article>

        <div className="usage-ops-grid">
          <article className="panel usage-flow-panel">
            <div className="panel-title">
              <h3>Fluxo de tokens</h3>
              <span>{period.toLowerCase()}</span>
            </div>
            <div className="usage-flow-chart">
              <OkamiAreaChart
                className="usage-flow-interactive"
                labels={periodLabels}
                lines={[{ key: "tokens", label: "tokens", values: periodSeries, color: "var(--ok-cyan)" }]}
                formatValue={(value) => formatTokenValue(value)}
                formatAxis={(value) => formatTokenValue(value).replace(" tokens", "")}
              />
              <div className="usage-chart-axis">
                {period === "Semanal"
                  ? <><span>d-6</span><span>d-5</span><span>d-4</span><span>d-3</span><span>d-2</span><span>d-1</span><span>hoje</span></>
                  : usageRows.map((item) => <span key={item.id}>{item.name.slice(0, 5)}</span>)}
              </div>
            </div>
            <div className="usage-distribution">
              {usageRows.map((item) => {
                const share = Math.round((Number(item.tokenRaw || 0) / totalTokens) * 100);
                return (
                  <div className={`usage-distribution-row tone-${actionTone(item.action)}`} key={item.id}>
                    <span>{item.name}</span>
                    <i><b style={{ width: `${Math.max(1, share)}%` }}></b></i>
                    <strong>{share}%</strong>
                    <em>{formatTokenValue(item.tokenRaw ?? 0)}</em>
                  </div>
                );
              })}
            </div>
          </article>

          <aside className="panel usage-command-center">
            <div className="panel-title">
              <h3>Decisao de assinatura</h3>
              <span>custo x uso</span>
            </div>
            {usageRows.map((item) => (
              <article className={`usage-decision-card tone-${actionTone(item.action)}`} key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.plan} · {actionLabel(item.action)}</span>
                </div>
                <p>{item.recommendation}</p>
                <footer>
                  <b>{formatCurrency(item.monthlyCost)}</b>
                  <i style={{ width: `${Math.max(2, item.utilization)}%` }}></i>
                  <em>{item.trend}</em>
                </footer>
              </article>
            ))}
          </aside>
        </div>

        <div className="usage-ledger panel">
          <div className="panel-title">
            <h3>Assinaturas</h3>
            <span>controle operacional</span>
          </div>
          <div className="usage-ledger-head">
            <span>plano</span><span>tokens</span><span>custo</span><span>forecast</span><span>uso relativo</span><span>acao</span>
          </div>
          <div className="usage-ledger-body">
            {usageRows.map((item) => (
              <article className={`usage-ledger-row tone-${actionTone(item.action)}`} key={item.id}>
                <div><strong>{item.name}</strong><span>{item.plan}</span></div>
                <b>{formatTokenValue(item.tokenRaw ?? 0)}</b>
                <b>{formatCurrency(item.monthlyCost)}</b>
                <b>{formatCurrency(item.monthlyForecast)}</b>
                <i><span style={{ width: `${Math.max(2, item.utilization)}%` }}></span></i>
                <em>{actionLabel(item.action)}</em>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function OfficeCommandStrip({ activeAgents, activeTasks, agentCount, selectedAgent, selectedTask, subagentCount }) {
  const stats = [
    ["agentes", agentCount],
    ["ativos", activeAgents],
    ["subagentes", subagentCount],
    ["tarefas", activeTasks],
  ];
  return (
    <article className="office-brief panel">
      <div className="office-brief-main">
          <span>OKAMI OFFICE</span>
          <strong>{selectedAgent.name} / {selectedAgent.status}</strong>
          <p>{selectedTask?.title ?? selectedAgent.currentTask ?? "Sem tarefa ativa vinculada"}</p>
      </div>
      <div className="office-brief-stats">
          {stats.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <b>{value}</b>
            </div>
          ))}
      </div>
    </article>
  );
}

function AgentCard({ agent, index, selected, onOpenMonitor, onOpenTask, onSelect }) {
  const subagents = agent.subagents ?? [];
  return (
    <article className={`office-agent-row agent-${agent.color} ${selected ? "is-selected" : ""}`} onClick={onSelect} role="button" tabIndex={0} onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect();
      }
    }}>
      <span className="office-agent-topline">
        <span className="office-agent-index">AG-{String(index + 1).padStart(2, "0")}</span>
        <span className="office-agent-state"><i></i>{agent.status}</span>
      </span>
      <span className="office-agent-identity">
        <span className="office-agent-avatar">{agent.name?.slice(0, 1)}</span>
        <span className="office-agent-name">
          <strong>{agent.name}</strong>
          <small>{agent.role}</small>
        </span>
      </span>
      <span className="office-agent-task">
        <small>Status_tarefa</small>
        <b>{agent.currentTask}</b>
      </span>
      <span className="office-agent-meta">
        <b><small>tool</small>{agent.tool}</b>
        <b><small>progresso</small>{agent.progress}%</b>
        <b><small>subagentes</small>{subagents.length}</b>
      </span>
      <span className="office-agent-subagents">
        {subagents.slice(0, 5).map((child) => <i key={child.id} title={child.task}></i>)}
      </span>
      <span className="office-agent-progress"><i style={{ width: `${agent.progress}%` }}></i></span>
      <span className="office-agent-actions">
        <button className="ghost-button" onClick={(event) => { event.stopPropagation(); onOpenTask(); }} type="button">Detalhes</button>
        <button className="primary-button" onClick={(event) => { event.stopPropagation(); onOpenMonitor(); }} type="button">Ver monitor</button>
      </span>
    </article>
  );
}

function AgentInspector({ agent, task, onOpenMonitor, onOpenTask }) {
  return (
    <aside className="office-inspector panel">
        <div className="agent-inspector-hero">
          <div className={`agent-orb agent-${agent.color}`}>{agent.name?.slice(0, 1)}</div>
          <div>
            <span>{agent.role}</span>
            <strong>{agent.name}</strong>
            <p>{task?.title ?? agent.currentTask}</p>
          </div>
        </div>

        <div className="panel-title">
          <h3>{agent.name}</h3>
          <span>{agent.status}</span>
        </div>

        <div className="agent-summary">
          <div>
            <span>Projeto</span>
            <strong>{agent.project}</strong>
          </div>
          <div>
            <span>Branch</span>
            <strong>{agent.branch}</strong>
          </div>
          <div>
            <span>Workspace</span>
            <strong>{agent.workspace}</strong>
          </div>
        </div>

        <MonitorPanel agent={agent} />
        <SubagentList subagents={agent.subagents ?? []} />

        <div className="inspector-actions">
          <button className="primary-button" onClick={onOpenMonitor} type="button">Ver monitor</button>
          <button className="ghost-button" onClick={onOpenTask} type="button">Abrir tarefa</button>
        </div>
    </aside>
  );
}

function MonitorPanel({ agent }) {
  return (
    <div className="monitor-frame">
      <div className="monitor-bar">
        <span>{agent.monitorTitle}</span>
        <b>live preview</b>
      </div>
      <pre>{agent.monitorLines.join("\n")}</pre>
    </div>
  );
}

function SubagentList({ subagents }) {
  return (
    <>
      <div className="panel-title compact">
        <h3>Subagentes</h3>
        <span>{subagents.length}</span>
      </div>
      <div className="office-subagents">
        {subagents.length ? subagents.slice(0, 5).map((child) => (
          <article key={child.id}>
            <b>{child.name}</b>
            <span>{child.status} · {child.model}</span>
          </article>
        )) : <p>Nenhum subagente recente.</p>}
      </div>
    </>
  );
}

function Office({ data }) {
  const { t } = useI18n();
  const [selectedAgentId, setSelectedAgentId] = useState(data.agents[0]?.id);
  const [modal, setModal] = useState(null);
  const selectedAgent = data.agents.find((agent) => agent.id === selectedAgentId) ?? data.agents[0];
  const tasks = Object.values(data.kanban ?? {}).flat();
  const selectedTask = findAgentActiveTask(selectedAgent, tasks);
  const activeAgents = data.agents.filter((agent) => !/idle|livre|awaiting|aguardando/i.test(String(agent.status))).length;
  const subagentCount = data.agents.reduce((sum, agent) => sum + (agent.subagents?.length ?? 0), 0);
  const activeTasks = tasks.filter((task) => !/(done|complete|completed|closed)/i.test(String(task.status ?? task.meta ?? ""))).length;

  useEffect(() => {
    if (!data.agents.some((agent) => agent.id === selectedAgentId)) {
      setSelectedAgentId(data.agents[0]?.id);
    }
  }, [data.agents, selectedAgentId]);

  return (
    <section className="view is-active">
      <SectionHead eyebrow={`§03 / ${t("section.office.eyebrow")}`} title={t("section.office.title")}>
        <button className="ghost-button" type="button" onClick={() => setModal({ type: "external", agent: selectedAgent, task: selectedTask })}>Abrir monitor externo</button>
      </SectionHead>
      <OfficeCommandStrip
        activeAgents={activeAgents}
        activeTasks={activeTasks}
        agentCount={data.agents.length}
        selectedAgent={selectedAgent}
        selectedTask={selectedTask}
        subagentCount={subagentCount}
      />
      <div className="office-layout">
        <div className="workstation-floor" aria-label="Estacoes dos agentes">
          {data.agents.map((agent, index) => (
            <AgentCard
              agent={agent}
              index={index}
              key={agent.id}
              selected={selectedAgent?.id === agent.id}
              onOpenMonitor={() => {
                setSelectedAgentId(agent.id);
                setModal({ type: "monitor", agent, task: findAgentActiveTask(agent, tasks) });
              }}
              onOpenTask={() => {
                setSelectedAgentId(agent.id);
                setModal({ type: "task", agent, task: findAgentActiveTask(agent, tasks) });
              }}
              onSelect={() => setSelectedAgentId(agent.id)}
            />
          ))}
        </div>
      </div>
      <DetailModal title={modal?.type === "task" ? modal?.task?.title ?? modal?.agent?.currentTask : modal?.agent?.name} eyebrow={modal?.type === "task" ? "tarefa atual" : modal?.type === "external" ? "monitor externo" : "monitor do agente"} onClose={() => setModal(null)}>
        {modal ? (
          <>
            {modal.type === "external" ? (
              <ObjectFacts data={{
                agente: modal.agent.name,
                endpoint: `/api/hermes/sessions?profile=${modal.agent.id}`,
                workspace: modal.agent.workspace,
                acao: "abrir terminal/stream externo quando websocket estiver habilitado",
              }} />
            ) : modal.type === "task" ? (
              <TaskDetail task={modal.task ?? { title: modal.agent.currentTask, owner: modal.agent.id, meta: "profile task" }} />
            ) : (
              <AgentMonitor agent={modal.agent} task={modal.task ?? findAgentActiveTask(modal.agent, tasks)} />
            )}
          </>
        ) : null}
      </DetailModal>
    </section>
  );
}

function Pixel({ data, source, loading }) {
  const { t } = useI18n();
  const realAgents = loading ? [] : (data.agents ?? []);
  const [selectedAgentId, setSelectedAgentId] = useState(realAgents[0]?.id);
  const [modalAgentId, setModalAgentId] = useState(null);
  const [pixelMode, setPixelMode] = useState("live");
  const [layoutVariant, setLayoutVariant] = useState("ops");
  const selectedAgent = realAgents.find((agent) => agent.id === selectedAgentId) ?? realAgents[0];
  const modalAgent = realAgents.find((agent) => agent.id === modalAgentId);
  const tasks = Object.values(data.kanban ?? {}).flat();
  const modalAgentTasks = modalAgent ? tasks.filter((task) => {
    const agentId = String(modalAgent.id ?? "").toLowerCase();
    const agentName = String(modalAgent.name ?? "").toLowerCase();
    const owner = String(task.owner ?? task.assignee ?? task.raw?.assignee ?? "").toLowerCase();
    const title = String(task.title ?? "").toLowerCase();
    const status = String(task.status ?? task.meta ?? "").toLowerCase();
    const currentTask = String(modalAgent.currentTask ?? "").toLowerCase();
    const active = !/(done|complete|completed|closed)/i.test(status);
    const matchesOwner = owner && (
      owner.includes(agentId)
      || agentId.includes(owner)
      || owner.includes(agentName)
      || agentName.includes(owner)
    );
    const matchesTitle = currentTask && title && (
      title.includes(currentTask.slice(0, 28))
      || currentTask.includes(title.slice(0, 28))
    );
    return active && (matchesOwner || matchesTitle);
  }).slice(0, 3) : [];
  // Key estável: só remonta o canvas quando layout ou modo realmente mudam.
  // Antes incluía realAgents — qualquer reordenação da API destruía o Phaser inteiro
  // (vídeo recarregando, sensação de "refresh" toda vez).
  const pixelAgentKey = `${layoutVariant}:${pixelMode}`;
  const selectPixelAgent = (agentId) => {
    setSelectedAgentId(agentId);
    setModalAgentId(agentId);
  };
  const cycleLayout = () => {
    const variants = ["ops", "studio", "compact"];
    const currentIndex = variants.indexOf(layoutVariant);
    setLayoutVariant(variants[(currentIndex + 1) % variants.length]);
    setPixelMode("layout");
  };

  useEffect(() => {
    if (!realAgents.some((agent) => agent.id === selectedAgentId)) {
      setSelectedAgentId(realAgents[0]?.id);
    }
  }, [realAgents, selectedAgentId]);

  return (
    <section className="view is-active">
      <SectionHead eyebrow={`§04 / ${t("section.pixel.eyebrow")}`} title={t("section.pixel.title")}>
        <div className="filters">
          <button className={pixelMode === "live" ? "is-active" : ""} onClick={() => setPixelMode("live")} type="button">Live</button>
          <button className={pixelMode === "layout" ? "is-active" : ""} onClick={cycleLayout} type="button">Layout: {layoutVariant}</button>
          <button className={pixelMode === "debug" ? "is-active" : ""} onClick={() => setPixelMode((mode) => (mode === "debug" ? "live" : "debug"))} type="button">Debug</button>
        </div>
      </SectionHead>

      <div className="pixel-layout">
        <div className="pixel-stage panel" aria-label="Pixel office dos agentes">
          <PixelOfficeCanvas
            key={pixelAgentKey}
            agents={realAgents}
            tasks={tasks}
            selectedAgentId={selectedAgent?.id}
            onSelectAgent={selectPixelAgent}
            mode={pixelMode}
            layoutVariant={layoutVariant}
          />
        </div>
      </div>
      <DetailModal title={modalAgent?.name} eyebrow="agente no Pixel Office" onClose={() => setModalAgentId(null)}>
        {modalAgent ? (
          <div className="pixel-agent-detail">
            <ObjectFacts data={{
              status: /idle|livre|awaiting|aguardando/i.test(String(modalAgent.status ?? modalAgent.currentTask ?? "")) ? "idle" : modalAgent.status,
              tarefa_atual: modalAgentTasks[0]?.title || modalAgent.currentTask || "sem tarefa ativa",
              profile: modalAgent.id,
              workspace: modalAgent.workspace,
              ferramenta: modalAgent.tool,
              progresso: `${modalAgent.progress ?? 0}%`,
            }} />
            <div className="pixel-task-strip">
              <span>tarefa atual</span>
              {modalAgentTasks.length ? modalAgentTasks.map((task, index) => (
                <button className="pixel-task-card" key={taskUiKey(task, modalAgent.id, index)} type="button">
                  <b>{task.title}</b>
                  <small>{task.status ?? task.meta ?? "ativo"} · {task.owner ?? modalAgent.name}</small>
                  <em>{task.description ?? task.body ?? task.raw?.description ?? "Sem descricao detalhada no retorno atual."}</em>
                </button>
              )) : (
                <p>Este agente está idle ou sem tarefa ativa vinculada ao kanban atual.</p>
              )}
            </div>
            <PixelAgentMonitor agent={modalAgent} tasks={modalAgentTasks} />
          </div>
        ) : null}
      </DetailModal>
    </section>
  );
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.filter((item) => item !== null && item !== undefined).map((item) => String(item));
  if (value === null || value === undefined || value === "") return [];
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (/^[\[{]/.test(trimmed)) {
      try {
        return normalizeList(JSON.parse(trimmed));
      } catch {
        return [trimmed];
      }
    }
    return trimmed.split(",").map((item) => item.trim()).filter(Boolean);
  }
  if (typeof value === "object") return Object.values(value).flatMap((item) => normalizeList(item));
  return [String(value)];
}

function taskUiKey(task, scope, index) {
  const boardKey = task?.boardSlug ?? task?.raw?._board_slug ?? task?.board ?? "board";
  const taskKey = task?.id ?? task?.task_id ?? task?.title ?? index;
  return `${boardKey}::${scope ?? task?.status ?? "task"}::${taskKey}::${index}`;
}

function TaskDetail({ task }) {
  const raw = task.raw ?? {};
  const description = task.body ?? task.description ?? raw.body ?? raw.description ?? raw.notes ?? "Sem descricao detalhada no retorno atual do Hermes.";
  const createdAt = raw.created_at ? new Date(Number(raw.created_at) * 1000).toLocaleString("pt-BR") : raw.createdAt;
  const startedAt = raw.started_at ? new Date(Number(raw.started_at) * 1000).toLocaleString("pt-BR") : raw.startedAt;
  const completedAt = raw.completed_at ? new Date(Number(raw.completed_at) * 1000).toLocaleString("pt-BR") : raw.completedAt;
  const skillList = normalizeList(raw.skills ?? task.skills);
  const comments = task.comments ?? raw.comments ?? [];
  const runHistory = task.runHistory ?? raw.runHistory ?? raw.runs ?? [];
  const workLog = task.workLog ?? raw.workLog ?? raw.events ?? [];
  return (
    <div className="task-modal-v2">
      <aside className="task-modal-sidebar">
        <ObjectFacts data={{
          id: task.id,
          status: task.status ?? raw.status ?? task.meta,
          prioridade: task.priority,
          assignee: raw.assignee ?? task.owner,
          tenant: raw.tenant ?? "-",
          workspace: raw.workspace_path ?? raw.workspace ?? "-",
          criado: createdAt ?? "-",
          iniciado: startedAt ?? "-",
          finalizado: completedAt ?? "-",
        }} />
        <div className="task-run-card">
          <span>resultado</span>
          <b>{raw.result ? "registrado" : "pendente"}</b>
          <p>{raw.result ?? "Nenhum resultado retornado ainda pelo Kanban do Hermes."}</p>
        </div>
        <div className="task-run-card">
          <span>skills</span>
          <b>{skillList.length || 0}</b>
          <p>{skillList.length ? skillList.join(", ") : "Sem skills declaradas nesta task."}</p>
        </div>
      </aside>
      <main className="task-modal-main">
        <section className="task-description-panel">
          <span>descricao</span>
          <p>{description}</p>
        </section>
        <div className="task-history-grid">
          <section>
            <div className="panel-title compact"><h3>Comentários</h3><span>{comments.length}</span></div>
            <TimelineList empty="Sem comentarios retornados pelo kanban.db." items={comments} />
          </section>
          <section>
            <div className="panel-title compact"><h3>Work Log</h3><span>{workLog.length}</span></div>
            <TimelineList empty="Sem eventos de work log para esta task." items={workLog} />
          </section>
          <section>
            <div className="panel-title compact"><h3>Run History</h3><span>{runHistory.length}</span></div>
            <TimelineList empty="Sem runs associados encontrados." items={runHistory} />
          </section>
        </div>
        <details className="task-payload-details">
          <summary>Payload Hermes</summary>
          <pre>{JSON.stringify(raw, null, 2)}</pre>
        </details>
      </main>
    </div>
  );
}

function TimelineList({ items, empty }) {
  if (!items?.length) {
    return (
      <div className="ok-empty">
        <span className="ok-empty__icon" aria-hidden="true">⌧</span>
        <span className="ok-empty__title">Sem dados</span>
        <span className="ok-empty__desc">{empty}</span>
      </div>
    );
  }
  return (
    <div className="timeline-list">
      {items.map((item, index) => {
        const content = summarizeRecord(item);
        const looksLikeMarkdown = typeof content === "string"
          && (content.includes("\n") || /[`*#-]/.test(content));
        return (
          <article key={`${item.id ?? item._table ?? "row"}-${index}`}>
            <span>{item._table ?? item.status ?? item.type ?? "event"}</span>
            <div className="timeline-list__body">
              {looksLikeMarkdown
                ? <MarkdownLite source={content} />
                : <p>{content}</p>}
            </div>
            <small>{recordTime(item)}</small>
          </article>
        );
      })}
    </div>
  );
}

function Kanban({ data }) {
  const { t } = useI18n();
  const [board, setBoard] = useState(data.kanban);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [draft, setDraft] = useState({ title: "", assignee: "Hermes", priority: "P2", status: "Triage", body: "" });
  const [syncStatus, setSyncStatus] = useState("Fonte planejada: ~/.hermes/kanban.db via /api/hermes/kanban/tasks.");

  // Lista de boards distintos detectados nas tasks (campo `board` vindo do backend).
  const boards = useMemo(() => {
    const names = new Set();
    Object.values(board).flat().forEach((task) => { if (task.board) names.add(task.board); });
    return [...names];
  }, [board]);

  // Mantém uma seleção válida quando os dados mudam.
  useEffect(() => {
    if (boards.length && (selectedBoard === null || !boards.includes(selectedBoard))) {
      setSelectedBoard(boards[0]);
    } else if (!boards.length && selectedBoard !== null) {
      setSelectedBoard(null);
    }
  }, [boards, selectedBoard]);

  // View filtrada pelo board selecionado. Sem boards múltiplos, usa o board inteiro.
  const visibleBoard = useMemo(() => {
    if (!boards.length || selectedBoard === null) return board;
    return Object.fromEntries(
      Object.entries(board).map(([column, tasks]) => [
        column,
        tasks.filter((task) => (task.board ?? boards[0]) === selectedBoard),
      ]),
    );
  }, [board, boards, selectedBoard]);

  const taskCount = Object.values(visibleBoard).flat().length;
  const blockedCount = Object.values(visibleBoard).flat().filter((task) => (
    String(task.meta).toLowerCase().includes("blocked")
    || String(task.status).toLowerCase().includes("blocked")
    || String(task.raw?.status).toLowerCase().includes("blocked")
  )).length;
  const ownerCount = new Set(Object.values(visibleBoard).flat().map((task) => task.owner).filter(Boolean)).size;
  const columnEntries = useMemo(() => {
    const orderedNames = new Set(kanbanColumnOrder.map((column) => column.toLowerCase()));
    const ordered = kanbanColumnOrder.map((column) => [column, visibleBoard[column] ?? visibleBoard[column.toLowerCase()] ?? []]);
    const extra = Object.entries(visibleBoard).filter(([column]) => !orderedNames.has(column.toLowerCase()));
    return [...ordered, ...extra];
  }, [visibleBoard]);

  useEffect(() => {
    setBoard(data.kanban);
    setSyncStatus("Sincronizado com ~/.hermes/kanban.db via ponte SSH.");
  }, [data.kanban]);

  async function createTask() {
    const title = draft.title.trim();
    if (!title) {
      setSyncStatus("Informe um titulo para criar a tarefa no Kanban do Hermes.");
      return;
    }

    setSyncStatus("Criando tarefa no Hermes Kanban...");
    const created = await createHermesKanbanTask({
      title,
      body: draft.body,
      assignee: draft.assignee,
      priority: draft.priority,
      status: draft.status.toLowerCase().replaceAll(" ", "_"),
      tenant: "okami",
    });

    const task = {
      id: created.id,
      title: created.title,
      meta: `Hermes kanban.db · ${created.status}`,
      priority: created.priority,
      owner: created.assignee,
      estimate: "sync",
      board: selectedBoard ?? undefined,
    };

    setBoard((current) => ({
      ...current,
      [draft.status]: [task, ...(current[draft.status] ?? [])],
    }));
    setDraft((current) => ({ ...current, title: "", body: "" }));
    setSyncStatus(`${created.id} criada. No backend real isso chama kanban_db/hermes kanban create --json.`);
  }

  return (
    <section className="view is-active">
      <SectionHead eyebrow={`§04 / ${t("section.kanban.eyebrow")}`} title={t("section.kanban.title")}>
        {boards.length > 1 ? (
          <div className="filters board-selector" aria-label="Selecionar board">
            {boards.map((boardName) => (
              <button
                className={selectedBoard === boardName ? "is-active" : ""}
                onClick={() => setSelectedBoard(boardName)}
                type="button"
                key={boardName}
              >
                {boardName}
              </button>
            ))}
          </div>
        ) : null}
        <button className="primary-button" onClick={createTask} type="button">Criar no Hermes</button>
      </SectionHead>
      <article className="kanban-brief panel">
        <div>
          <span>Hermes kanban.db</span>
          <strong>{taskCount} tarefas operacionais</strong>
          <p>{blockedCount ? `${blockedCount} bloqueio(s) precisam de revisao antes do proximo ciclo.` : "Board sincronizado sem bloqueios reportados no snapshot atual."}</p>
        </div>
        <div className="kanban-brief-metrics">
          <div><span>tarefas</span><b>{taskCount}</b></div>
          <div><span>bloqueios</span><b>{blockedCount}</b></div>
          <div><span>agentes</span><b>{ownerCount}</b></div>
          <div><span>fonte</span><b>SSH</b></div>
        </div>
      </article>
      <div className="kanban-sync-panel panel">
        <label>Titulo<input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Nova tarefa para o Hermes" /></label>
        <label>Assignee<input value={draft.assignee} onChange={(event) => setDraft((current) => ({ ...current, assignee: event.target.value }))} /></label>
        <label>Prioridade<select value={draft.priority} onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value }))}><option>P1</option><option>P2</option><option>P3</option></select></label>
        <label>Coluna<select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}>{[...new Set([draft.status, ...Object.keys(board)])].map((column) => <option key={column}>{column}</option>)}</select></label>
        <label className="wide">Body / acceptance criteria<input value={draft.body} onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))} placeholder="Contexto que sera salvo na task" /></label>
        <p>{syncStatus}</p>
      </div>
      <div className="kanban">
        {columnEntries.map(([column, tasks]) => (
          <article key={column}>
            <div className="kanban-column-head">
              <h3>{column}</h3>
              <span>{tasks.length}</span>
            </div>
            {tasks.length ? tasks.map((task, index) => (
              <button className={`task ${task.hot ? "hot" : ""}`} key={taskUiKey(task, column, index)} type="button" onClick={() => setSelectedTask({ ...task, column })}>
                <div className="task-topline">
                  <em>{task.priority}</em>
                  <small>{task.owner} · {task.estimate}</small>
                </div>
                <b>{task.title}</b>
                <span>{task.meta}</span>
                {task.body || task.description ? <p>{String(task.body ?? task.description).slice(0, 150)}</p> : null}
              </button>
            )) : (
              <div className="ok-empty kanban-empty-column">
                <span className="ok-empty__icon" aria-hidden="true">∅</span>
                <span className="ok-empty__title">Coluna vazia</span>
                <span className="ok-empty__desc">Arraste uma task ou crie uma nova.</span>
              </div>
            )}
          </article>
        ))}
      </div>
      <DetailModal title={selectedTask?.title} eyebrow="detalhe da tarefa Hermes" onClose={() => setSelectedTask(null)}>
        {selectedTask ? (
          <TaskDetail task={selectedTask} />
        ) : null}
      </DetailModal>
    </section>
  );
}

function Apis({ data }) {
  const [apis, setApis] = useState(data.apiKeys);
  const [selectedApiId, setSelectedApiId] = useState(data.apiKeys[0]?.id);
  const [apiStatus, setApiStatus] = useState({ tone: "idle", message: "Selecione uma conexao para editar." });
  const selectedApi = apis.find((api) => api.id === selectedApiId) ?? apis[0];

  useEffect(() => {
    setApis(data.apiKeys);
    if (!data.apiKeys.some((api) => api.id === selectedApiId)) {
      setSelectedApiId(data.apiKeys[0]?.id);
    }
  }, [data.apiKeys, selectedApiId]);

  function updateSelectedApi(field, value) {
    setApis((current) => current.map((api) => (
      api.id === selectedApi.id ? { ...api, [field]: value } : api
    )));
    setApiStatus({ tone: "dirty", message: "Alteracoes locais ainda nao salvas." });
  }

  function addApi() {
    const nextIndex = apis.length + 1;
    const nextApi = {
      id: `api-${Date.now()}`,
      name: `Nova API ${nextIndex}`,
      maskedValue: "secret-••••",
      detail: "Novo ambiente",
      latency: 0,
      usage: 0,
      status: "watch",
    };

    setApis((current) => [nextApi, ...current]);
    setSelectedApiId(nextApi.id);
    setApiStatus({ tone: "dirty", message: "Nova API criada localmente. Revise e salve." });
  }

  async function saveSelectedApi() {
    setApiStatus({ tone: "pending", message: `Salvando ${selectedApi.name}...` });
    try {
      await saveApiConfig(selectedApi);
      setApiStatus({ tone: "ok", message: `${selectedApi.name} salva. A VPS recebera esta chamada quando o endpoint estiver ativo.` });
    } catch (error) {
      setApiStatus({ tone: "warn", message: `Falha ao salvar: ${error.message}` });
    }
  }

  async function testSelectedApi() {
    setApiStatus({ tone: "pending", message: `Testando ${selectedApi.name}...` });
    try {
      const result = await testApiConnection(selectedApi);
      setApiStatus({
        tone: result.healthy ? "ok" : "warn",
        message: `${result.message} · ${result.latency ?? selectedApi.latency}ms`,
      });
    } catch (error) {
      setApiStatus({ tone: "warn", message: `Falha no teste: ${error.message}` });
    }
  }

  async function rotateSelectedApi() {
    setApiStatus({ tone: "pending", message: `Rotacionando secret de ${selectedApi.name}...` });
    try {
      const result = await rotateApiSecret(selectedApi);
      if (result.maskedValue) {
        updateSelectedApi("maskedValue", result.maskedValue);
      }
      setApiStatus({ tone: "ok", message: `Secret de ${selectedApi.name} rotacionado.` });
    } catch (error) {
      setApiStatus({ tone: "warn", message: `Falha ao rotacionar: ${error.message}` });
    }
  }

  async function deleteSelectedApi() {
    const deletedApiName = selectedApi.name;
    const remainingApis = apis.filter((api) => api.id !== selectedApi.id);
    const nextSelectedApi = remainingApis[0];

    setApiStatus({ tone: "pending", message: `Excluindo ${deletedApiName}...` });
    try {
      await deleteApiConfig(selectedApi);
      setApis(remainingApis);
      setSelectedApiId(nextSelectedApi?.id);
      setApiStatus({ tone: "warn", message: `${deletedApiName} excluida da lista.` });
    } catch (error) {
      setApiStatus({ tone: "warn", message: `Falha ao excluir: ${error.message}` });
    }
  }

  return (
    <section className="view is-active">
      <SectionHead eyebrow="§05 / secure config" title="APIs e secrets por ambiente">
        <button className="primary-button" onClick={addApi} type="button">Adicionar API</button>
      </SectionHead>

      <div className="api-workbench">
        <div className="api-list panel">
          <div className="panel-title"><h3>Conexoes</h3><span>{apis.length} providers</span></div>
          {apis.map((api) => (
            <button
              className={`api-row ${selectedApi.id === api.id ? "is-selected" : ""}`}
              key={api.id}
              onClick={() => setSelectedApiId(api.id)}
              type="button"
            >
              <span>
                <b>{api.name}</b>
                <small>{api.detail}</small>
              </span>
              <em>{api.status}</em>
              <i style={{ width: `${api.usage}%` }}></i>
            </button>
          ))}
        </div>

        <aside className="api-editor panel">
          <div className="panel-title">
            <h3>Editar {selectedApi.name}</h3>
            <span>{selectedApi.status}</span>
          </div>
          <div className="api-form">
            <label>Nome<input value={selectedApi.name} onChange={(event) => updateSelectedApi("name", event.target.value)} /></label>
            <label>Secret<input value={selectedApi.maskedValue} onChange={(event) => updateSelectedApi("maskedValue", event.target.value)} /></label>
            <label>Ambiente<input value={selectedApi.detail} onChange={(event) => updateSelectedApi("detail", event.target.value)} /></label>
            <label>Status<select value={selectedApi.status} onChange={(event) => updateSelectedApi("status", event.target.value)}><option>healthy</option><option>watch</option><option>disabled</option></select></label>
            <label>Uso %<input type="number" value={selectedApi.usage} onChange={(event) => updateSelectedApi("usage", Number(event.target.value))} /></label>
            <label>Latencia ms<input type="number" value={selectedApi.latency} onChange={(event) => updateSelectedApi("latency", Number(event.target.value))} /></label>
          </div>
          <div className="api-editor-actions">
            <button className="primary-button" onClick={saveSelectedApi} type="button">Salvar API</button>
            <button className="ghost-button" onClick={testSelectedApi} type="button">Testar conexao</button>
            <button className="ghost-button" onClick={rotateSelectedApi} type="button">Rotacionar secret</button>
            <button className="danger-button" disabled={apis.length <= 1} onClick={deleteSelectedApi} type="button">Excluir API</button>
          </div>
          <p className={`api-status-strip tone-${apiStatus.tone}`}>{apiStatus.message}</p>
        </aside>
      </div>

      <div className="ops-grid">
        <article className="panel">
          <div className="panel-title"><h3>Rate limits</h3><span>usage</span></div>
          <StatList items={apis.map((api) => ({ label: api.name, value: `${api.usage}%` }))} />
        </article>
        <article className="panel">
          <div className="panel-title"><h3>Rotacao</h3><span>secrets</span></div>
          <div className="terminal">
            <p><span>OpenAI</span> rotacao em 18 dias</p>
            <p><span>Anthropic</span> token principal validado</p>
            <p><span>GitHub</span> escopo repo/admin limitado</p>
          </div>
        </article>
        <article className="panel">
          <div className="panel-title"><h3>Diagnostico</h3><span>{selectedApi.name}</span></div>
          <div className="health-list">
            <div className={`health-row tone-${selectedApi.status === "healthy" ? "healthy" : "watch"}`}>
              <span>latencia</span><b>{selectedApi.latency}ms</b><i style={{ width: `${Math.max(10, 100 - selectedApi.latency / 8)}%` }}></i>
            </div>
            <div className={`health-row tone-${selectedApi.usage > 80 ? "watch" : "healthy"}`}>
              <span>rate limit</span><b>{selectedApi.usage}%</b><i style={{ width: `${selectedApi.usage}%` }}></i>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

function Apps({ data }) {
  const [apps, setApps] = useState(data.apps);
  const [selectedApp, setSelectedApp] = useState(null);

  useEffect(() => setApps(data.apps), [data.apps]);

  async function addApp() {
    const nextApp = {
      id: `app-${Date.now()}`,
      name: "Novo link",
      url: "https://",
      detail: "Ambiente a configurar",
      status: "Draft",
      uptime: 0,
      env: "stage",
    };
    setApps((current) => [nextApp, ...current]);
    setSelectedApp(nextApp);
    await saveAppConfig(nextApp).catch(() => null);
  }

  return (
    <section className="view is-active">
      <SectionHead eyebrow="§06 / application registry" title="Links dos produtos e ambientes">
        <button className="primary-button" type="button" onClick={addApp}>Novo link</button>
      </SectionHead>
      <div className="app-grid">
        {apps.map((app) => (
          <button className="app-card" key={app.id ?? app.name} type="button" onClick={() => setSelectedApp(app)}>
            <b>{app.name}</b>
            <span>{app.detail}</span>
            <em>{app.status}</em>
            <small>{app.env} · {app.uptime}% uptime</small>
          </button>
        ))}
      </div>
      <div className="ops-grid">
        <article className="panel">
          <div className="panel-title"><h3>Ambientes</h3><span>registry</span></div>
          <StatList items={[
            { label: "prod", value: apps.filter((app) => app.env === "prod").length },
            { label: "stage", value: apps.filter((app) => app.env === "stage").length },
            { label: "private", value: apps.filter((app) => app.env === "private").length },
          ]} />
        </article>
      </div>
      <DetailModal title={selectedApp?.name} eyebrow="registro de aplicacao" onClose={() => setSelectedApp(null)}>
        {selectedApp ? (
          <>
            <div className="api-form single-column-form">
              <label>Nome<input value={selectedApp.name} onChange={(event) => setSelectedApp((current) => ({ ...current, name: event.target.value }))} /></label>
              <label>URL<input value={selectedApp.url} onChange={(event) => setSelectedApp((current) => ({ ...current, url: event.target.value }))} /></label>
              <label>Detalhe<input value={selectedApp.detail} onChange={(event) => setSelectedApp((current) => ({ ...current, detail: event.target.value }))} /></label>
              <label>Ambiente<input value={selectedApp.env} onChange={(event) => setSelectedApp((current) => ({ ...current, env: event.target.value }))} /></label>
            </div>
            <div className="api-editor-actions">
              <button className="primary-button" type="button" onClick={async () => {
                await saveAppConfig(selectedApp);
                setApps((current) => current.map((app) => (app.id === selectedApp.id ? selectedApp : app)));
              }}>Salvar link</button>
              <button className="ghost-button" type="button" onClick={() => window.open(selectedApp.url, "_blank", "noopener")}>Abrir</button>
              <button className="danger-button" type="button" onClick={async () => {
                await deleteAppConfig(selectedApp);
                setApps((current) => current.filter((app) => app.id !== selectedApp.id));
                setSelectedApp(null);
              }}>Excluir</button>
            </div>
          </>
        ) : null}
      </DetailModal>
    </section>
  );
}

function Docs({ data }) {
  const [docs, setDocs] = useState(data.docs);
  const [selectedDoc, setSelectedDoc] = useState(null);

  useEffect(() => setDocs(data.docs), [data.docs]);

  async function syncDocs() {
    setDocs(data.docs);
  }

  function createDocDraft() {
    setSelectedDoc({
      id: `doc-${Date.now().toString(16)}`,
      title: "Novo documento",
      body: "Resumo curto para agentes.",
      content: "# Novo documento\n\nAdicione aqui o conteudo que sera usado pelos agentes.",
      source: "manual",
      updated: "agora",
      coverage: 0,
      isNew: true,
    });
  }

  function docText(doc) {
    return doc?.content ?? doc?.text ?? doc?.markdown ?? doc?.raw?.content ?? doc?.raw?.text ?? doc?.body ?? "";
  }

  async function saveSelectedDoc() {
    const docToSave = {
      ...selectedDoc,
      id: selectedDoc.id ?? selectedDoc.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      updated: selectedDoc.updated || "agora",
      coverage: Number(selectedDoc.coverage ?? 0),
    };
    delete docToSave.isNew;
    await saveDocConfig(docToSave);
    setDocs((current) => {
      const key = selectedDoc.id ?? selectedDoc.title;
      const exists = current.some((doc) => (doc.id ?? doc.title) === key);
      if (!exists) return [docToSave, ...current];
      return current.map((doc) => ((doc.id ?? doc.title) === key ? docToSave : doc));
    });
    setSelectedDoc(docToSave);
  }

  async function deleteSelectedDoc() {
    const docToDelete = { ...selectedDoc, id: selectedDoc.id ?? selectedDoc.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") };
    await deleteDocConfig(docToDelete);
    setDocs((current) => current.filter((doc) => (doc.id ?? doc.title) !== (selectedDoc.id ?? selectedDoc.title)));
    setSelectedDoc(null);
  }

  return (
    <section className="view is-active">
      <SectionHead eyebrow="§07 / knowledge base" title="Documentacao viva para agentes">
        <div className="section-actions">
          <button className="ghost-button" type="button" onClick={syncDocs}>Sincronizar</button>
          <button className="primary-button" type="button" onClick={createDocDraft}>Novo doc</button>
        </div>
      </SectionHead>
      <div className="docs-grid">
        {docs.map((doc) => (
          <button className="panel doc-panel" key={doc.id ?? doc.title} type="button" onClick={() => setSelectedDoc(doc)}>
            <h3>{doc.title}</h3>
            <p>{doc.body}</p>
            <div className="card-metrics">
              <b>{doc.coverage}% cobertura</b>
              <i style={{ width: `${doc.coverage}%` }}></i>
              <em>{doc.updated}</em>
            </div>
            {docText(doc) ? <span className="doc-content-badge">texto disponivel</span> : null}
          </button>
        ))}
      </div>
      <div className="ops-grid">
        <article className="panel">
          <div className="panel-title"><h3>Checklist documental</h3><span>coverage</span></div>
          <div className="terminal">
            <p><span>runbooks</span> incidentes e rollback cobertos</p>
            <p><span>agents</span> falta politica de memoria por agente</p>
            <p><span>system</span> tokens visuais sincronizados</p>
          </div>
        </article>
      </div>
      <DetailModal title={selectedDoc?.title} eyebrow="documentacao" onClose={() => setSelectedDoc(null)}>
        {selectedDoc ? (
          <>
            <ObjectFacts data={{
              fonte: selectedDoc.source ?? "registry",
              atualizado: selectedDoc.updated,
              cobertura: `${selectedDoc.coverage}%`,
              conteudo: docText(selectedDoc) ? "texto" : "sem texto",
            }} />
            <div className="api-form single-column-form">
              <label>Titulo<input value={selectedDoc.title} onChange={(event) => setSelectedDoc((current) => ({ ...current, title: event.target.value }))} /></label>
              <label>Resumo<input value={selectedDoc.body} onChange={(event) => setSelectedDoc((current) => ({ ...current, body: event.target.value }))} /></label>
              <label>Fonte<input value={selectedDoc.source ?? ""} onChange={(event) => setSelectedDoc((current) => ({ ...current, source: event.target.value }))} /></label>
              <label>Cobertura %<input type="number" value={selectedDoc.coverage ?? 0} onChange={(event) => setSelectedDoc((current) => ({ ...current, coverage: Number(event.target.value) }))} /></label>
              <label className="doc-content-field">Conteudo em texto<textarea value={docText(selectedDoc)} onChange={(event) => setSelectedDoc((current) => ({ ...current, content: event.target.value }))} placeholder="Markdown, runbook, briefing ou texto livre." /></label>
            </div>
            <article className="doc-text-preview">
              <div className="panel-title compact"><h3>Preview do conteudo</h3><span>{docText(selectedDoc) ? `${docText(selectedDoc).length} chars` : "vazio"}</span></div>
              {docText(selectedDoc) ? <pre>{docText(selectedDoc)}</pre> : <p>Sem conteudo em texto para exibir.</p>}
            </article>
            <div className="api-editor-actions">
              <button className="primary-button" type="button" onClick={saveSelectedDoc}>Salvar doc</button>
              <button className="danger-button" type="button" onClick={deleteSelectedDoc}>Excluir</button>
            </div>
          </>
        ) : null}
      </DetailModal>
    </section>
  );
}

function fileKind(file) {
  const ext = String(file?.name?.split(".").pop() || file?.path?.split(".").pop() || "").toLowerCase();
  const raw = String(file?.type || ext || "").toLowerCase();
  if (file?.name === ".env" || raw === "env") return "env";
  if (raw === "json") return "json";
  if (raw === "yaml" || raw === "yml") return "yaml";
  if (raw === "md" || raw === "markdown" || ext === "md") return "md";
  return "text";
}

function parseEditableFields(content, kind) {
  if (!content) return [];
  if (kind === "json") {
    try {
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return Object.entries(parsed).map(([key, value]) => ({ key, value: typeof value === "string" ? value : JSON.stringify(value, null, 2) }));
      }
    } catch {
      return [];
    }
  }
  if (kind === "env") {
    return content.split("\n")
      .filter((line) => line.trim() && !line.trim().startsWith("#") && line.includes("="))
      .map((line) => {
        const [key, ...rest] = line.split("=");
        return { key: key.trim(), value: rest.join("=").trim() };
      });
  }
  if (kind === "yaml") {
    return content.split("\n")
      .filter((line) => /^\s*[\w.-]+\s*:/.test(line))
      .map((line) => {
        const [key, ...rest] = line.split(":");
        return { key: key.trim(), value: rest.join(":").trim() };
      });
  }
  return [];
}

function fieldsToContent(fields, fallback, kind) {
  if (!fields.length) return fallback;
  if (kind === "json") {
    const next = {};
    fields.forEach((field) => {
      try {
        next[field.key] = JSON.parse(field.value);
      } catch {
        next[field.key] = field.value;
      }
    });
    return `${JSON.stringify(next, null, 2)}\n`;
  }
  if (kind === "env") return `${fields.map((field) => `${field.key}=${field.value}`).join("\n")}\n`;
  if (kind === "yaml") return `${fields.map((field) => `${field.key}: ${field.value}`).join("\n")}\n`;
  return fallback;
}

function cronLineFromFields(fields) {
  return `${fields.minute || "*"} ${fields.hour || "*"} ${fields.dayOfMonth || "*"} ${fields.month || "*"} ${fields.dayOfWeek || "*"} ${fields.command || ""}`.trim();
}

function cronFieldsFromJob(job) {
  if (!job) return { minute: "*", hour: "*", dayOfMonth: "*", month: "*", dayOfWeek: "*", command: "" };
  if (job.source === "crontab") {
    return {
      minute: job.minute ?? "*",
      hour: job.hour ?? "*",
      dayOfMonth: job.dayOfMonth ?? "*",
      month: job.month ?? "*",
      dayOfWeek: job.dayOfWeek ?? "*",
      command: job.command ?? "",
    };
  }
  return { minute: "*", hour: "*", dayOfMonth: "*", month: "*", dayOfWeek: "*", command: job.raw ?? job.command ?? "" };
}

function compactText(value, max = 180) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function listText(value, fallback = "global") {
  if (Array.isArray(value)) return value.length ? value.join(", ") : fallback;
  return value ? String(value) : fallback;
}

function normalizeToken(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function markdownOutline(content = "") {
  return String(content)
    .split("\n")
    .filter((line) => /^#{1,4}\s+/.test(line.trim()))
    .slice(0, 12)
    .map((line) => line.replace(/^#{1,4}\s+/, "").trim());
}

function markdownPreviewBlocks(content = "") {
  const text = String(content || "").trim();
  if (!text) return [];
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .slice(0, 10);
}

function stripMarkup(value = "") {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " [script removido] ")
    .replace(/<script[\s\S]*/gi, " [script removido] ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<style[\s\S]*/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMaybeJson(value = "") {
  const text = String(value).trim();
  if (!text || !/^[{[]/.test(text)) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function humanLogMessage(value = "") {
  const text = String(value).trim();
  const parsed = parseMaybeJson(text);
  if (parsed && typeof parsed === "object") {
    const summary = parsed.message ?? parsed.error ?? parsed.status ?? parsed.title ?? parsed.url ?? parsed.result ?? "JSON log";
    const details = Object.entries(parsed)
      .slice(0, 8)
      .map(([key, item]) => `${key}: ${typeof item === "string" ? item : JSON.stringify(item).slice(0, 180)}`);
    return { format: "json", summary: compactText(summary, 220), details, raw: JSON.stringify(parsed, null, 2) };
  }
  if (/<[a-z][\s\S]*>/i.test(text)) {
    const clean = stripMarkup(text);
    const cloudflare = /challenge|cookies|javascript|cf_chl|cloudflare/i.test(text);
    const readableText = clean.split(/\[script removido\]/i)[0]?.trim() || clean;
    return {
      format: "html",
      summary: cloudflare ? "Bloqueio/challenge HTML detectado. O alvo pediu JavaScript/cookies ou protecao anti-bot." : compactText(clean, 220),
      details: [
        cloudflare ? "Tipo: challenge / anti-bot" : "Tipo: HTML",
        readableText ? `Texto: ${compactText(readableText, 180)}` : "Texto limpo vazio",
      ],
      raw: text,
    };
  }
  if (/traceback|exception|error/i.test(text)) {
    const lines = text.split(/\n+/).filter(Boolean);
    return { format: "error", summary: compactText(lines.at(-1) ?? text, 220), details: lines.slice(0, 6), raw: text };
  }
  return { format: "text", summary: compactText(text, 240), details: [], raw: text };
}

function logTone(line = "") {
  const text = String(line).toLowerCase();
  if (/error|exception|failed|traceback|fatal/.test(text)) return "danger";
  if (/warn|retry|blocked|timeout|challenge/.test(text)) return "warn";
  if (/success|saved|ok|done|completed/.test(text)) return "ok";
  return "info";
}

function readableLogLine(line = "") {
  const text = String(line);
  const time = text.match(/\d{2}:\d{2}:\d{2}/)?.[0] ?? text.match(/\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/)?.[0] ?? "log";
  const source = text.match(/==>\s*(.*?)\s*<==/)?.[1]?.split("/").pop() ?? text.match(/^\[?([A-Za-z0-9_.-]+)\]?[:\s]/)?.[1] ?? "hermes";
  const rawMessage = text.replace(/^==>.*?<==\s*/, "").trim();
  const parsed = humanLogMessage(rawMessage);
  return { time, source, tone: logTone(text), message: parsed.summary, format: parsed.format, details: parsed.details, raw: parsed.raw };
}

function systemdCalendarFromSchedule(schedule = "") {
  const text = String(schedule);
  const match = text.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/);
  if (match) return `${match[1]} ${match[2]}`;
  return "*-*-* 09:00:00";
}

function sessionStatus(session) {
  return session?.status ?? (session?.ended_at ? "inactive" : "active");
}

function sessionDuration(session) {
  if (!session?.started_at) return "-";
  const start = Number(session.started_at) * 1000;
  const end = session.ended_at ? Number(session.ended_at) * 1000 : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return "-";
  const minutes = Math.max(0, Math.round((end - start) / 60000));
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}min` : `${hours}h`;
}

function sessionTokenParts(session) {
  const input = Number(session?.input_tokens ?? 0);
  const output = Number(session?.output_tokens ?? 0);
  const cache = Number(session?.cache_read_tokens ?? 0);
  const total = Math.max(input + output + cache, Number(session?.tokens ?? 0), 1);
  return [
    { label: "input", value: input, color: "cyan", width: Math.max(2, (input / total) * 100) },
    { label: "output", value: output, color: "orange", width: Math.max(2, (output / total) * 100) },
    { label: "cache", value: cache, color: "magenta", width: Math.max(2, (cache / total) * 100) },
  ];
}

function skillUsageSummary(skill, doc) {
  const parsed = parseMaybeJson(doc?.content ?? "");
  const state = parsed?.state ?? "desconhecido";
  const lastUsed = parsed?.last_used_at ?? skill?.last_used_at ?? "-";
  const created = parsed?.created_at ?? "-";
  return [
    { label: "Estado", value: state },
    { label: "Criada", value: created },
    { label: "Ultimo uso", value: lastUsed },
    { label: "Uso", value: `${skill?.use_count ?? parsed?.use_count ?? 0} uses` },
    { label: "Views", value: `${skill?.view_count ?? parsed?.view_count ?? 0} views` },
    { label: "Patches", value: `${skill?.patch_count ?? parsed?.patch_count ?? 0} patches` },
  ];
}

function AdminHero({ eyebrow, title, description, stats = [], children }) {
  return (
    <div className="admin-hero">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      <div className="admin-hero-stats">
        {stats.map((stat) => (
          <div key={stat.label}>
            <span>{stat.label}</span>
            <b>{stat.value}</b>
          </div>
        ))}
      </div>
      {children ? <div className="admin-hero-actions">{children}</div> : null}
    </div>
  );
}

function StructuredFilePanel({ file, titlePrefix = "arquivo", inline = false }) {
  const [draft, setDraft] = useState(file?.content ?? "");
  const [fields, setFields] = useState([]);
  const [mode, setMode] = useState("fields");
  const [status, setStatus] = useState("");
  const [fieldQuery, setFieldQuery] = useState("");
  const kind = fileKind(file);
  const parsedFields = useMemo(() => parseEditableFields(draft, kind), [draft, kind]);
  const outline = useMemo(() => markdownOutline(draft), [draft]);
  const previewBlocks = useMemo(() => markdownPreviewBlocks(draft), [draft]);
  const canUseFields = parsedFields.length > 0;
  const visibleFields = fields
    .map((field, index) => ({ ...field, index }))
    .filter((field) => `${field.key} ${field.value}`.toLowerCase().includes(fieldQuery.toLowerCase()));

  useEffect(() => {
    const nextDraft = file?.content ?? "";
    const nextKind = fileKind(file);
    setDraft(nextDraft);
    setFields(parseEditableFields(nextDraft, nextKind));
    setMode(nextKind === "md" || nextKind === "markdown" ? "read" : parseEditableFields(nextDraft, nextKind).length ? "fields" : "raw");
    setStatus("");
    setFieldQuery("");
  }, [file]);

  function updateField(index, value) {
    setFields((current) => current.map((field, fieldIndex) => (fieldIndex === index ? { ...field, value } : field)));
  }

  function fieldIsMultiline(field) {
    return String(field.value ?? "").includes("\n") || String(field.value ?? "").length > 96 || /^[{[]/.test(String(field.value ?? "").trim());
  }

	  async function saveFile() {
	    if (file.readonly || String(file.path ?? "").includes("#")) {
	      setStatus("Este registro e somente leitura. Abra um arquivo editavel do agente para salvar mudancas.");
	      return;
	    }
	    setStatus("Salvando arquivo...");
    const content = mode === "fields" ? fieldsToContent(fields, draft, kind) : draft;
    try {
	      const result = await saveHermesFile(file.path, content);
	      setDraft(content);
	      setStatus(result.saved
	        ? `Salvo em ${result.path || file.path}${result.message ? ` · ${result.message}` : ""}`
	        : `Falha ao salvar: ${result.error || "sem detalhe"}`);
    } catch (error) {
      setStatus(`Falha ao salvar: ${error.message}`);
    }
  }

  if (!file) {
    return (
      <article className="panel management-detail empty">
        <p>Selecione um item para visualizar e editar.</p>
      </article>
    );
  }

  const body = (
    <>
      <ObjectFacts data={{
        profile: file.profile ?? "global",
        path: file.path,
        tipo: kind,
        chars: draft.length,
      }} />
      <div className="detail-toolbar">
        {kind === "md" || kind === "markdown" ? <button className={mode === "read" ? "primary-button" : "ghost-button"} type="button" onClick={() => setMode("read")}>Leitura</button> : null}
        {canUseFields ? <button className={mode === "fields" ? "primary-button" : "ghost-button"} type="button" onClick={() => setMode("fields")}>Campos</button> : null}
	        <button className={mode === "raw" ? "primary-button" : "ghost-button"} type="button" onClick={() => setMode("raw")}>Texto bruto</button>
      </div>
      {mode === "read" ? (
        <div className="document-reader">
          <aside>
            <span>Sumario</span>
            {outline.length ? outline.map((item) => <b key={item}>{item}</b>) : <b>Sem titulos detectados</b>}
          </aside>
          <div className="document-copy">
            {previewBlocks.length ? previewBlocks.map((block, index) => (
              /^#{1,4}\s+/.test(block) ? <h4 key={`${block}-${index}`}>{block.replace(/^#{1,4}\s+/, "")}</h4> : <p key={`${block}-${index}`}>{block}</p>
            )) : <p>Arquivo vazio.</p>}
          </div>
        </div>
      ) : mode === "fields" && canUseFields ? (
        <>
          {fields.length > 12 ? (
            <div className="field-editor-toolbar">
              <input className="okami-search" placeholder="filtrar campos..." value={fieldQuery} onChange={(event) => setFieldQuery(event.target.value)} />
              <span>{visibleFields.length}/{fields.length} campos</span>
            </div>
          ) : null}
          <div className="field-editor">
            {visibleFields.map((field) => (
                <label className={fieldIsMultiline(field) ? "is-wide" : ""} key={`${field.key}-${field.index}`}>
                  <span>{field.key}</span>
                  {fieldIsMultiline(field)
                    ? <textarea value={field.value} onChange={(event) => updateField(field.index, event.target.value)} />
                    : <input value={field.value} onChange={(event) => updateField(field.index, event.target.value)} />}
                </label>
              ))}
          </div>
        </>
      ) : (
        <div className="api-form single-column-form">
	          <label>Conteudo do arquivo<textarea value={draft} onChange={(event) => setDraft(event.target.value)} /></label>
        </div>
      )}
      <div className="api-editor-actions">
	        <button className="primary-button" type="button" onClick={saveFile}>Salvar arquivo</button>
        {status ? <span className="inline-status">{status}</span> : null}
      </div>
    </>
  );

  if (inline) {
    return (
      <article className="panel management-detail">
        <div className="panel-title"><h3>{file.name}</h3><span>{titlePrefix}</span></div>
        {body}
      </article>
    );
  }

  return body;
}

function FileEditorModal({ file, titlePrefix = "arquivo", onClose }) {
  return (
    <DetailModal title={file?.name} eyebrow={titlePrefix} onClose={onClose}>
      {file ? <StructuredFilePanel file={file} titlePrefix={titlePrefix} /> : null}
    </DetailModal>
  );
}

const ownerApiScopes = ["admin", "read", "write", "ssh", "kanban", "logs"];
const apiKeyProfiles = [
  {
    id: "readonly",
    label: "Leitura segura",
    name: "agent-readonly",
    scopes: ["read"],
    detail: "Dashboard, sessoes e consultas sem alterar nada.",
  },
  {
    id: "operator",
    label: "Agente operador",
    name: "agent-operator",
    scopes: ["read", "write", "kanban", "logs"],
    detail: "Docs, registros, Kanban e logs. Nao executa SSH.",
  },
  {
    id: "runtime",
    label: "Agente completo",
    name: "agent-completo",
    scopes: ["read", "write", "ssh", "kanban", "logs"],
    detail: "Para agentes que precisam de comandos permitidos pela conexao SSH.",
  },
  {
    id: "admin",
    label: "Admin reserva",
    name: "admin-backup",
    scopes: ownerApiScopes,
    detail: "Outra key completa para administrar, revogar e recuperar acesso.",
  },
];

function Config({ data }) {
  const { t } = useI18n();
  const [authStatus, setAuthStatus] = useState(null);
  const [keys, setKeys] = useState([]);
  const [tokenDraft, setTokenDraft] = useState(() => getMissionApiToken());
  const keyName = "Minha Okami API Key";
  const [advancedProfile, setAdvancedProfile] = useState(apiKeyProfiles[0].id);
  const [advancedName, setAdvancedName] = useState(apiKeyProfiles[0].name);
  const [createdToken, setCreatedToken] = useState("");
  const [status, setStatus] = useState("");
  const [busyAction, setBusyAction] = useState("");

  async function refreshAuth() {
    if (!isMissionApiConfigured()) {
      setAuthStatus({ configured: false, bootstrapAvailable: false, keyCount: 0, staticTokenConfigured: false, proxyConfigured: false });
      setKeys([]);
      return;
    }

    try {
      const nextStatus = await getAuthStatus();
      setAuthStatus(nextStatus);
      if (nextStatus.proxyConfigured || nextStatus.staticTokenConfigured || getMissionApiToken()) {
        try {
          setKeys(await listApiKeys());
        } catch {
          setKeys([]);
        }
      } else {
        setKeys([]);
      }
    } catch (error) {
      setStatus(`Falha ao ler auth: ${error.message}`);
    }
  }

  useEffect(() => {
    refreshAuth();
  }, []);

  function saveToken() {
    saveMissionApiToken(tokenDraft.trim());
    setStatus(tokenDraft.trim() ? "Acesso vinculado a este navegador." : "Acesso removido deste navegador.");
    refreshAuth();
  }

  function clearToken() {
    clearMissionApiToken();
    setTokenDraft("");
    setKeys([]);
    setStatus("Acesso local removido. Prepare ou cole outra key para acessar o servidor.");
  }

  async function maybeCopyToken(token) {
    if (!token) return false;
    try {
      await navigator.clipboard.writeText(token);
      return true;
    } catch {
      return false;
    }
  }

  async function generateOwnerKey() {
    if (!isMissionApiConfigured()) {
      setStatus("Modo demo ativo. Inicie a API local para preparar um acesso real.");
      return null;
    }

    setBusyAction("owner");
    setStatus("Preparando acesso do painel...");
    try {
      const latestStatus = authStatus ?? await getAuthStatus();
      const name = keyName.trim() || "Minha Okami API Key";
      let result;

      if (latestStatus?.bootstrapAvailable) {
        result = await bootstrapApiKey(name);
      } else if (latestStatus?.localDevTrusted || latestStatus?.proxyConfigured || latestStatus?.staticTokenConfigured || getMissionApiToken()) {
        result = await createApiKey({ name, scopes: ownerApiScopes });
        if (result?.token) saveMissionApiToken(result.token);
      } else {
        setStatus("Ja existe uma key no servidor. Cole uma key admin existente abaixo para este navegador poder criar novos acessos.");
        return null;
      }

      if (!result?.token) {
        setStatus("O servidor nao retornou uma key nova. Recarregue o status e tente novamente.");
        return null;
      }

      setCreatedToken(result.token);
      setTokenDraft(result.token);
      const copied = await maybeCopyToken(result.token);
      setStatus(copied
        ? "Acesso do painel criado, vinculado a este navegador e copiado."
        : "Acesso do painel criado e vinculado a este navegador. Guarde a key exibida abaixo como backup.");
      await refreshAuth();
      return result;
    } catch (error) {
      setStatus(`Falha ao preparar acesso: ${error.message}`);
      return null;
    } finally {
      setBusyAction("");
    }
  }

  async function ensurePanelAccess() {
    if (!isMissionApiConfigured()) return true;
    if (getMissionApiToken() || authStatus?.localDevTrusted || authStatus?.proxyConfigured || authStatus?.staticTokenConfigured) return true;

    const latestStatus = await getAuthStatus();
    setAuthStatus(latestStatus);
    if (latestStatus?.bootstrapAvailable) {
      const result = await generateOwnerKey();
      return Boolean(result?.token || getMissionApiToken());
    }

    setStatus("Para conectar agentes, vincule primeiro uma key admin existente neste navegador.");
    return false;
  }

  async function generateAdvancedKey() {
    const profile = apiKeyProfiles.find((item) => item.id === advancedProfile) ?? apiKeyProfiles[0];
    const name = advancedName.trim() || profile.name;
    if (!name) {
      setStatus("Informe um nome para a key.");
      return;
    }

    setBusyAction("advanced");
    setStatus(`Gerando key ${name}...`);
    try {
      const result = await createApiKey({ name, scopes: profile.scopes });
      setCreatedToken(result.token);
      const copied = await maybeCopyToken(result.token);
      setStatus(copied
        ? `Key ${result.key.name} criada e copiada.`
        : `Key ${result.key.name} criada. Copie agora; ela nao sera exibida de novo.`);
      await refreshAuth();
    } catch (error) {
      setStatus(`Falha ao gerar key: ${error.message}`);
    } finally {
      setBusyAction("");
    }
  }

  async function revokeKey(id) {
    setStatus("Revogando key...");
    try {
      await revokeApiKey(id);
      setStatus("Key revogada.");
      await refreshAuth();
    } catch (error) {
      setStatus(`Falha ao revogar: ${error.message}`);
    }
  }

  async function copyCreatedToken() {
    if (!createdToken) return;
    try {
      await navigator.clipboard.writeText(createdToken);
      setStatus("API key copiada.");
    } catch {
      setStatus("Nao consegui copiar automaticamente. Selecione a key manualmente.");
    }
  }

  const tokenPreview = tokenDraft ? `${tokenDraft.slice(0, 18)}...${tokenDraft.slice(-8)}` : "nao vinculada";
  const canBootstrap = authStatus?.bootstrapAvailable;
  const hasAdminKey = keys.some((key) => key.scopes?.includes("admin") && !key.revokedAt) || authStatus?.localDevTrusted || authStatus?.proxyConfigured || authStatus?.staticTokenConfigured;
  const canCreateManagedKey = hasAdminKey || Boolean(getMissionApiToken());
  const advancedProfileData = apiKeyProfiles.find((item) => item.id === advancedProfile) ?? apiKeyProfiles[0];
  const activeRuntimeCount = (data?.agentRuntimes ?? []).filter((runtime) => !/missing|template|planned/i.test(String(runtime.status))).length;

  return (
    <section className="view is-active admin-page config-hub">
      <AdminHero
        eyebrow={`§08 / ${t("section.config.eyebrow")}`}
        title={t("section.config.title")}
        description="Conecte o servidor e os agentes em um unico lugar. O painel prepara as keys automaticamente, sem pedir edicao manual de arquivo."
        stats={[
          { label: "Servidor", value: isMissionApiConfigured() ? "api" : "demo" },
          { label: "Acesso", value: tokenDraft || authStatus?.localDevTrusted || authStatus?.proxyConfigured ? "auto" : "pendente" },
          { label: "Navegador", value: tokenDraft ? "vinculado" : "sem key" },
          { label: "Agentes", value: data?.agentRuntimes?.length ?? activeRuntimeCount },
        ]}
      />

      <nav className="config-hub-nav" aria-label="Atalhos de agentes">
        <button type="button" onClick={() => document.getElementById("config-hermes")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Servidor dos agentes</button>
        <button type="button" onClick={() => document.getElementById("config-agents")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Agentes conectados</button>
        <button type="button" onClick={() => document.getElementById("config-access")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Acesso avancado</button>
      </nav>

      <section className="config-hub-section" id="config-hermes">
        <Hermes data={data} embedded ensurePanelAccess={ensurePanelAccess} />
      </section>

      <section className="config-hub-section" id="config-agents">
        <AgentRuntimes data={data} embedded ensurePanelAccess={ensurePanelAccess} />
      </section>

      <details className="panel config-access-panel config-access-details" id="config-access">
        <summary>Acesso e keys (avancado)</summary>
        <div className="config-access-main">
          <div>
            <div className="panel-title"><h3>Acesso do painel</h3><span>{canBootstrap ? "primeiro acesso" : "acesso"}</span></div>
            <p className="management-summary">
              O painel prepara esse acesso automaticamente ao conectar servidor ou agente. A key aparece aqui apenas como backup.
            </p>
          </div>
          <button className="primary-button config-primary-action" disabled={busyAction === "owner"} type="button" onClick={generateOwnerKey}>
            {busyAction === "owner" ? "Preparando..." : "Criar backup de acesso"}
          </button>
        </div>

        <div className="config-access-grid">
          <div className="config-status-card">
            <h4>Status</h4>
            <ObjectFacts data={{
              servidor: isMissionApiConfigured() ? "conectado" : "demo",
              chaves: authStatus?.configured ? "configuradas" : "nenhuma",
              bootstrap: canBootstrap ? "disponivel" : "indisponivel",
              navegador: tokenPreview,
            }} />
          </div>
          <div className="config-status-card">
            <h4>O que ela libera</h4>
            <div className="runtime-chip-list">
              {ownerApiScopes.map((scope) => <span key={scope}>{scope}</span>)}
            </div>
            <p className="management-summary">Este e o acesso completo do dono do dashboard. Para agentes, prefira o botao Conectar agente abaixo.</p>
          </div>
        </div>

        {createdToken ? (
          <div className="config-key-output">
            <label>Key criada agora (backup)<textarea readOnly value={createdToken} /></label>
            <button className="primary-button" type="button" onClick={copyCreatedToken}>Copiar key</button>
          </div>
        ) : null}

        {status ? <p className="api-status-strip tone-dirty">{status}</p> : null}

        <details className="config-advanced">
          <summary>Avancado: colar key existente ou gerar uma key manual</summary>
          <div className="config-advanced-grid">
            <article>
              <div className="panel-title"><h3>Vincular key existente</h3><span>navegador</span></div>
              <div className="api-form single-column-form">
                <label>Okami API Key<input value={tokenDraft} onChange={(event) => setTokenDraft(event.target.value)} placeholder="okami_key_..." /></label>
              </div>
              <div className="api-editor-actions">
                <button className="primary-button" type="button" onClick={saveToken}>Vincular key</button>
                <button className="ghost-button" type="button" onClick={clearToken}>Remover deste navegador</button>
                <button className="ghost-button" type="button" onClick={refreshAuth}>Recarregar status</button>
              </div>
            </article>

            <article>
              <div className="panel-title"><h3>Key manual</h3><span>suporte</span></div>
              <div className="api-form single-column-form">
                <label>Perfil<select value={advancedProfile} onChange={(event) => {
                  const profile = apiKeyProfiles.find((item) => item.id === event.target.value) ?? apiKeyProfiles[0];
                  setAdvancedProfile(profile.id);
                  setAdvancedName(profile.name);
                }}>
                  {apiKeyProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.label}</option>)}
                </select></label>
                <label>Nome da key<input value={advancedName} onChange={(event) => setAdvancedName(event.target.value)} /></label>
              </div>
              <p className="management-summary">{advancedProfileData.detail}</p>
              <div className="runtime-chip-list">
                {advancedProfileData.scopes.map((scope) => <span key={scope}>{scope}</span>)}
              </div>
              <div className="api-editor-actions">
                <button className="primary-button" disabled={!canCreateManagedKey || busyAction === "advanced"} type="button" onClick={generateAdvancedKey}>
                  {busyAction === "advanced" ? "Gerando..." : "Gerar key manual"}
                </button>
              </div>
            </article>
          </div>
        </details>

        <article className="config-key-list">
          <div className="panel-title"><h3>Acessos cadastrados</h3><span>{keys.length}</span></div>
          <div className="data-table api-key-table">
            <div><span>nome</span><span>prefixo</span><span>scopes</span><span>ultimo uso</span><span>acao</span></div>
            {keys.length ? keys.map((key) => (
              <div key={key.id}>
                <b>{key.name}</b>
                <span>{key.tokenPrefix}</span>
                <span>{key.scopes?.join(", ")}</span>
                <span>{key.lastUsedAt ?? "nunca"}</span>
                <button className="danger-button" disabled={key.revokedAt || !hasAdminKey} type="button" onClick={() => revokeKey(key.id)}>Revogar</button>
              </div>
            )) : (
              <div><b>Nenhuma key listada</b><span>vincule uma key admin para listar</span><span>-</span><span>-</span><span>-</span></div>
            )}
          </div>
        </article>
      </details>
    </section>
  );
}

function runtimeMatchesAgent(runtime, agent) {
  const runtimeId = normalizeToken(runtime?.id);
  const haystack = `${agent?.id ?? ""} ${agent?.name ?? ""} ${agent?.tool ?? ""} ${agent?.role ?? ""}`.toLowerCase();
  if (runtimeId === "hermes") return haystack.includes("hermes");
  if (runtimeId === "codex") return haystack.includes("codex");
  if (runtimeId === "claude") return haystack.includes("claude");
  if (runtimeId === "openclaw") return haystack.includes("openclaw");
  if (runtimeId === "openhuman") return haystack.includes("openhuman");
  return runtimeId ? haystack.includes(runtimeId) : false;
}

function normalizeAgentRuntimes(data) {
  const legacyHermesFiles = data.hermes?.configFiles?.length
    ? data.hermes.configFiles
    : [
      { name: "config.yaml", path: data.hermes?.configPath ?? "~/.hermes/config.yaml", profile: "global", type: "yaml", content: "Aguardando leitura real via SSH." },
      { name: ".env", path: data.hermes?.envPath ?? "~/.hermes/.env", profile: "global", type: "env", content: "Aguardando leitura real via SSH." },
    ];
	  const baseRuntimes = data.agentRuntimes?.length ? data.agentRuntimes : [{
	    id: "hermes",
	    name: "Agente principal",
	    family: "orchestrator",
	    status: data.hermes?.sshStatus?.status ?? "needs-ssh",
	    command: "hermes",
	    home: data.hermes?.hermesHome ?? "~/.hermes",
	    configPath: data.hermes?.configPath ?? "~/.hermes/config.yaml",
	    workspacePath: `${data.hermes?.hermesHome ?? "~/.hermes"}/profiles`,
	    dashboardUrl: data.hermes?.localDashboard ?? "privado via SSH",
	    summary: "Agente principal detectado a partir da conexao SSH dos agentes.",
	    recommendedScopes: ["read", "ssh", "kanban", "logs"],
	    suggestedKeyName: "hermes-runtime",
	    capabilities: ["state.db", "kanban.db", "profiles", "logs"],
		    setup: ["Conectar servidor", "Ler arquivos remotos", "Conectar agentes"],
	    configs: legacyHermesFiles,
	    instances: data.agents ?? [],
	  }];

  return baseRuntimes.map((runtime) => {
    const isHermes = runtime.id === "hermes";
    const configs = isHermes && legacyHermesFiles.length ? legacyHermesFiles : runtime.configs ?? [];
    const derivedInstances = (data.agents ?? []).filter((agent) => runtimeMatchesAgent(runtime, agent));
    return {
      ...runtime,
      configs,
      instances: derivedInstances.length ? derivedInstances : runtime.instances ?? [],
      recommendedScopes: runtime.recommendedScopes ?? ["read"],
      capabilities: runtime.capabilities ?? [],
      setup: runtime.setup ?? [],
      commands: runtime.commands ?? [],
    };
  });
}

function mergeRuntimeList(baseRuntimes, extraRuntimes) {
  const byId = new Map();
  [...baseRuntimes, ...extraRuntimes].forEach((runtime) => {
    if (!runtime?.id) return;
    byId.set(runtime.id, { ...(byId.get(runtime.id) ?? {}), ...runtime });
  });
  return [...byId.values()];
}

function createRuntimeDraft(seed = {}) {
  const id = normalizeToken(seed.id || seed.name || "my-agent") || "my-agent";
  const configPath = seed.configPath || "~/.agents/registry.json";
  return {
    id,
    name: seed.name || "Meu agente",
    family: seed.family || "custom",
    command: seed.command || `${id} status`,
    home: seed.home || `~/.agents/workspaces/${id}`,
    configPath,
    workspacePath: seed.workspacePath || seed.workspace || `~/.agents/workspaces/${id}`,
    dashboardUrl: seed.dashboardUrl || "custom",
    recommendedScopes: seed.recommendedScopes || ["read"],
    suggestedKeyName: seed.suggestedKeyName || `${id}-agent`,
    summary: seed.summary || "Agente externo registrado para operar pelo Okami Monitor.",
  };
}

function AgentRuntimes({ data, embedded = false, ensurePanelAccess = async () => true }) {
  const { t } = useI18n();
  const [localRuntimes, setLocalRuntimes] = useState([]);
  const runtimes = useMemo(() => mergeRuntimeList(normalizeAgentRuntimes(data), localRuntimes), [data, localRuntimes]);
  const [selectedRuntimeId, setSelectedRuntimeId] = useState(runtimes[0]?.id ?? "hermes");
  const selectedRuntime = runtimes.find((runtime) => runtime.id === selectedRuntimeId) ?? runtimes[0];
  const runtimeConfigs = selectedRuntime?.configs ?? [];
  const [selectedPath, setSelectedPath] = useState(runtimeConfigs[0]?.path ?? null);
  const selectedFile = runtimeConfigs.find((file) => file.path === selectedPath) ?? runtimeConfigs[0] ?? null;
  const activeRuntimeCount = runtimes.filter((runtime) => !/missing|template|planned/i.test(String(runtime.status))).length;
	  const [runtimeDraft, setRuntimeDraft] = useState(() => createRuntimeDraft());
	  const [runtimeStatus, setRuntimeStatus] = useState("");
	  const [commandOutput, setCommandOutput] = useState("");
	  const [connectingRuntimeId, setConnectingRuntimeId] = useState("");

  useEffect(() => {
    if (!runtimes.some((runtime) => runtime.id === selectedRuntimeId)) {
      setSelectedRuntimeId(runtimes[0]?.id ?? "hermes");
    }
  }, [runtimes.map((runtime) => runtime.id).join("|"), selectedRuntimeId]);

  useEffect(() => {
    if (!runtimeConfigs.some((file) => file.path === selectedPath)) {
      setSelectedPath(runtimeConfigs[0]?.path ?? null);
    }
  }, [selectedRuntimeId, runtimeConfigs.map((file) => file.path).join("|"), selectedPath]);

  function updateRuntimeDraft(field, value) {
    setRuntimeDraft((current) => {
      const next = { ...current, [field]: value };
      if (field === "id") {
        const id = normalizeToken(value) || value;
        next.suggestedKeyName = current.suggestedKeyName === `${current.id}-agent` ? `${id}-agent` : current.suggestedKeyName;
        if (current.command === `${current.id} status`) next.command = `${id} status`;
        if (current.home === `~/.agents/workspaces/${current.id}`) next.home = `~/.agents/workspaces/${id}`;
        if (current.workspacePath === `~/.agents/workspaces/${current.id}`) next.workspacePath = `~/.agents/workspaces/${id}`;
      }
      return next;
    });
  }

	  async function connectRuntime(runtime) {
	    if (!runtime?.id) return;
	    setConnectingRuntimeId(runtime.id);
	    setRuntimeStatus(`Conectando ${runtime.name}...`);
	    try {
	      const hasAccess = await ensurePanelAccess();
	      if (!hasAccess) {
	        setRuntimeStatus("Antes de conectar agentes, vincule o acesso do painel neste navegador.");
	        return;
	      }

	      const result = await connectAgentRuntime(runtime);
	      const connectedRuntime = result.runtime ?? runtime;
	      setLocalRuntimes((current) => mergeRuntimeList(current, [connectedRuntime]));
	      setSelectedRuntimeId(connectedRuntime.id);
	      setRuntimeStatus(result.injection?.saved
	        ? `${connectedRuntime.name} conectado. Acesso aplicado em ${result.injection.path}.`
	        : `${connectedRuntime.name} com acesso pronto no painel. ${result.injection?.message ?? "Configure o SSH dos agentes para aplicar automaticamente no servidor."}`);
	    } catch (error) {
	      setRuntimeStatus(`Falha ao conectar agente: ${error.message}`);
	    } finally {
	      setConnectingRuntimeId("");
	    }
	  }

	  async function connectRuntimeDraft() {
	    const id = normalizeToken(runtimeDraft.id);
	    if (!id) {
	      setRuntimeStatus("Informe um identificador simples para o agente.");
	      return;
	    }
	    const runtime = {
      ...runtimeDraft,
      id,
      recommendedScopes: runtimeDraft.recommendedScopes,
      commands: [{ label: "Health", command: runtimeDraft.command }],
      configs: [{
        name: runtimeDraft.configPath.split("/").pop() || "registry.json",
        path: runtimeDraft.configPath,
        runtime: id,
        profile: "global",
        type: runtimeDraft.configPath.split(".").pop() || "json",
        content: "",
      }],
      instances: [{
        id,
        name: runtimeDraft.name,
        role: runtimeDraft.family,
        status: "registered",
	        workspace: runtimeDraft.workspacePath,
	      }],
	    };
	    await connectRuntime(runtime);
	  }

  async function deleteSelectedRuntime() {
    if (!selectedRuntime?.id || ["hermes", "openclaw", "openhuman", "claude", "codex", "custom"].includes(selectedRuntime.id)) {
	      setRuntimeStatus("Remova apenas agentes externos registrados por voce.");
      return;
    }
	    setRuntimeStatus(`Removendo ${selectedRuntime.name}...`);
    try {
      await deleteAgentRuntimeConfig(selectedRuntime);
      setLocalRuntimes((current) => current.filter((runtime) => runtime.id !== selectedRuntime.id));
      setSelectedRuntimeId("custom");
	      setRuntimeStatus(`Agente ${selectedRuntime.name} removido.`);
    } catch (error) {
      setRuntimeStatus(`Falha ao remover agente: ${error.message}`);
    }
  }

  async function runRuntimeCommand(command) {
    setCommandOutput(`Executando ${command}...`);
    try {
      const result = await runHermesCommand(command);
      setCommandOutput(result.output || `Comando finalizado com exit ${result.exitCode}`);
    } catch (error) {
      setCommandOutput(`Falha ao executar comando: ${error.message}`);
    }
  }

  return (
	    <section className={embedded ? "config-embedded-block agent-runtime-embedded" : "view is-active admin-page"}>
	      {embedded ? (
	        <SectionHead eyebrow={t("section.config.eyebrow")} title={t("section.config.title")}>
	          <select className="okami-select" value={selectedRuntimeId} onChange={(event) => setSelectedRuntimeId(event.target.value)}>
	            {runtimes.map((runtime) => <option key={runtime.id} value={runtime.id}>{runtime.name}</option>)}
	          </select>
	        </SectionHead>
	      ) : (
	        <AdminHero
	          eyebrow={`§09 / ${t("section.config.eyebrow")}`}
	          title={t("section.config.title")}
	          description="Conecte OpenClaw, OpenHuman, Claude, Codex e outros agentes com key automatica, arquivos editaveis e comandos permitidos."
	          stats={[
	            { label: "Agentes", value: runtimes.length },
	            { label: "Ativos", value: activeRuntimeCount },
	            { label: "Arquivos", value: runtimeConfigs.length },
	            { label: "Selecionado", value: selectedRuntime?.name ?? "-" },
	          ]}
        >
          <select className="okami-select" value={selectedRuntimeId} onChange={(event) => setSelectedRuntimeId(event.target.value)}>
            {runtimes.map((runtime) => <option key={runtime.id} value={runtime.id}>{runtime.name}</option>)}
          </select>
        </AdminHero>
	      )}
	      <article className="panel runtime-register-panel">
	        <div className="panel-title"><h3>Conectar novo agente</h3><span>automatico</span></div>
	        <p className="management-summary">
	          O painel cria a key do agente, guarda o segredo no cofre e tenta preparar o arquivo de acesso no workspace remoto. O usuario nao precisa colar key em arquivo.
	        </p>
	        <div className="api-form runtime-register-form">
	          <label>Identificador<input value={runtimeDraft.id} onChange={(event) => updateRuntimeDraft("id", event.target.value)} placeholder="opencode" /></label>
	          <label>Nome<input value={runtimeDraft.name} onChange={(event) => updateRuntimeDraft("name", event.target.value)} placeholder="OpenCode" /></label>
	          <label>Tipo<input value={runtimeDraft.family} onChange={(event) => updateRuntimeDraft("family", event.target.value)} placeholder="coding-cli" /></label>
	          <label>Comando de teste<input value={runtimeDraft.command} onChange={(event) => updateRuntimeDraft("command", event.target.value)} placeholder="opencode status" /></label>
	          <label>Pasta do agente<input value={runtimeDraft.home} onChange={(event) => updateRuntimeDraft("home", event.target.value)} placeholder="~/.agents/workspaces/opencode" /></label>
	          <label>Arquivo principal<input value={runtimeDraft.configPath} onChange={(event) => updateRuntimeDraft("configPath", event.target.value)} placeholder="~/.agents/registry.json" /></label>
	          <label>Workspace<input value={runtimeDraft.workspacePath} onChange={(event) => updateRuntimeDraft("workspacePath", event.target.value)} placeholder="~/.agents/workspaces/opencode" /></label>
	          <label>Nome interno da key<input value={runtimeDraft.suggestedKeyName} onChange={(event) => updateRuntimeDraft("suggestedKeyName", event.target.value)} /></label>
	        </div>
	        <div className="api-editor-actions">
	          <button className="primary-button" disabled={connectingRuntimeId === normalizeToken(runtimeDraft.id)} type="button" onClick={connectRuntimeDraft}>
	            {connectingRuntimeId === normalizeToken(runtimeDraft.id) ? "Conectando..." : "Conectar agente"}
	          </button>
	          <button className="ghost-button" type="button" onClick={() => setRuntimeDraft(createRuntimeDraft())}>Limpar</button>
	          {runtimeStatus ? <span className="inline-status">{runtimeStatus}</span> : null}
	        </div>
	      </article>
	      <div className="config-workbench agent-runtime-workbench">
	        <aside className="panel config-profile-rail">
	          <div className="panel-title"><h3>Agentes</h3><span>{runtimes.length}</span></div>
	          <div className="tab-list">
	            {runtimes.map((runtime) => (
	              <button className={runtime.id === selectedRuntimeId ? "is-active" : ""} key={runtime.id} type="button" onClick={() => setSelectedRuntimeId(runtime.id)}>
	                <b>{runtime.name}</b>
                <span>{runtime.status ?? "unknown"} · {runtime.family ?? "agent"}</span>
              </button>
            ))}
          </div>
	        </aside>
	        <aside className="panel management-list config-file-rail">
	          <div className="panel-title"><h3>Arquivos do agente</h3><span>{runtimeConfigs.length}</span></div>
	          <div className="tab-list">
            {runtimeConfigs.length ? runtimeConfigs.map((file) => (
              <button className={file.path === selectedFile?.path ? "is-active" : ""} key={file.path} type="button" onClick={() => setSelectedPath(file.path)}>
                <b>{file.name}</b>
                <span>{fileKind(file)} · {file.profile ?? selectedRuntime.id} · {file.path}</span>
              </button>
	            )) : (
	              <button className="is-active" type="button">
	                <b>Sem arquivo</b>
	                <span>defina um arquivo principal para este agente</span>
	              </button>
	            )}
	          </div>
	        </aside>
	        <article className="panel management-detail agent-runtime-detail">
	          <div className="panel-title"><h3>{selectedRuntime?.name ?? "Agente"}</h3><span>{selectedRuntime?.family ?? "agent"}</span></div>
	          <p className="management-summary">{selectedRuntime?.summary ?? "Agente sem descricao cadastrada."}</p>
	          <ObjectFacts data={{
	            status: selectedRuntime?.status ?? "unknown",
	            acesso: selectedRuntime?.apiKey?.injectionStatus ?? "pendente",
	            key: selectedRuntime?.apiKey?.tokenPrefix ?? "nao criada",
	            comando: selectedRuntime?.command ?? "-",
	            pasta: selectedRuntime?.home ?? "-",
	            arquivo: selectedRuntime?.configPath ?? "-",
	            workspace: selectedRuntime?.workspacePath ?? "-",
	            arquivo_de_acesso: selectedRuntime?.apiKey?.envPath ?? "-",
	          }} />
	          <div className="runtime-link-row">
	            {selectedRuntime?.docsUrl ? <a className="ghost-button" href={selectedRuntime.docsUrl} rel="noreferrer" target="_blank">Docs</a> : null}
	            {selectedRuntime?.repoUrl ? <a className="ghost-button" href={selectedRuntime.repoUrl} rel="noreferrer" target="_blank">Repo</a> : null}
	            <span>key interna: {selectedRuntime?.suggestedKeyName ?? `${selectedRuntime?.id ?? "agent"}-key`}</span>
	          </div>
	          <div className="api-editor-actions">
	            <button className="primary-button" disabled={!selectedRuntime || connectingRuntimeId === selectedRuntime.id} type="button" onClick={() => connectRuntime(selectedRuntime)}>
	              {connectingRuntimeId === selectedRuntime?.id ? "Conectando..." : selectedRuntime?.apiKey ? "Renovar acesso do agente" : "Conectar agente"}
	            </button>
	            <button className="ghost-button" type="button" onClick={() => setRuntimeDraft(createRuntimeDraft(selectedRuntime))}>Usar como base</button>
	            <button className="danger-button" type="button" onClick={deleteSelectedRuntime}>Remover agente externo</button>
	          </div>
	          <div className="agent-runtime-sections">
            <section>
              <div className="panel-title compact"><h3>Capacidades</h3><span>{selectedRuntime?.capabilities?.length ?? 0}</span></div>
              <div className="runtime-chip-list">
                {(selectedRuntime?.capabilities?.length ? selectedRuntime.capabilities : ["metadata flexivel"]).map((item) => <span key={item}>{item}</span>)}
              </div>
            </section>
	            <section>
	              <div className="panel-title compact"><h3>Permissoes</h3><span>key do agente</span></div>
	              <div className="runtime-chip-list">
	                {(selectedRuntime?.recommendedScopes ?? ["read"]).map((scope) => <span key={scope}>{scope}</span>)}
	              </div>
	            </section>
	            <section>
	              <div className="panel-title compact"><h3>Pendencias</h3><span>{selectedRuntime?.setup?.length ?? 0}</span></div>
	              <div className="runtime-list">
	                {(selectedRuntime?.setup?.length ? selectedRuntime.setup : ["Cadastrar comando de teste e arquivo principal"]).map((item) => <p key={item}>{item}</p>)}
	              </div>
	            </section>
            <section>
              <div className="panel-title compact"><h3>Comandos</h3><span>{selectedRuntime?.commands?.length ?? 0}</span></div>
              <div className="runtime-list">
                {(selectedRuntime?.commands?.length ? selectedRuntime.commands : [{ label: "Health", command: `${selectedRuntime?.command ?? "agent"} status` }]).map((item) => (
                  <p key={`${item.label}-${item.command}`}>
                    <b>{item.label}</b>
                    <code>{item.command}</code>
                    <button className="ghost-button" type="button" onClick={() => runRuntimeCommand(item.command)}>Executar</button>
                  </p>
                ))}
              </div>
            </section>
	          </div>
	          {commandOutput ? <pre className="okami-pre runtime-command-output">{commandOutput}</pre> : null}
	          <div className="runtime-instance-strip">
	            <div className="panel-title compact"><h3>Instancias</h3><span>{selectedRuntime?.instances?.length ?? 0}</span></div>
            <div>
	              {(selectedRuntime?.instances?.length ? selectedRuntime.instances : [{ id: "empty", name: "Sem instancia detectada", role: "configure este agente", status: "idle", workspace: selectedRuntime?.workspacePath ?? "-" }]).map((instance) => (
                <article key={instance.id ?? instance.name}>
                  <b>{instance.name}</b>
                  <span>{instance.status ?? "unknown"} · {instance.role ?? "agent"}</span>
                  <small>{instance.workspace ?? selectedRuntime?.workspacePath ?? "-"}</small>
                </article>
              ))}
            </div>
	          </div>
	          <div className="runtime-file-panel">
	            <div className="panel-title compact"><h3>Editar arquivo do agente</h3><span>{selectedFile ? fileKind(selectedFile) : "sem arquivo"}</span></div>
	            <StructuredFilePanel file={selectedFile} titlePrefix={`${selectedRuntime?.name ?? "agente"} arquivo`} />
	          </div>
        </article>
      </div>
    </section>
  );
}

function Profiles({ data }) {
  const { t } = useI18n();
  const docs = data.hermes?.profileDocs ?? [];
  const agents = data.agents ?? [];
  const groupedDocs = docs.reduce((groups, doc) => {
    groups[doc.profile] = groups[doc.profile] ?? [];
    groups[doc.profile].push(doc);
    return groups;
  }, {});
  const [selectedAgentId, setSelectedAgentId] = useState(agents[0]?.id ?? agents[0]?.name ?? "");
  const selectedAgent = agents.find((agent) => (agent.id ?? agent.name) === selectedAgentId) ?? agents[0];
  const selectedFiles = groupedDocs[selectedAgent?.id] ?? groupedDocs[selectedAgent?.name?.toLowerCase()] ?? [];
  const [selectedPath, setSelectedPath] = useState(selectedFiles[0]?.path ?? null);
  const selectedFile = selectedFiles.find((file) => file.path === selectedPath) ?? selectedFiles[0] ?? null;

  useEffect(() => {
    if (!agents.some((agent) => (agent.id ?? agent.name) === selectedAgentId)) setSelectedAgentId(agents[0]?.id ?? agents[0]?.name ?? "");
  }, [agents.map((agent) => agent.id ?? agent.name).join("|"), selectedAgentId]);

  useEffect(() => {
    if (!selectedFiles.some((file) => file.path === selectedPath)) setSelectedPath(selectedFiles[0]?.path ?? null);
  }, [selectedAgentId, selectedFiles.map((file) => file.path).join("|"), selectedPath]);

  return (
    <section className="view is-active admin-page">
      <AdminHero
        eyebrow={`§09 / ${t("section.profiles.eyebrow")}`}
        title={t("section.profiles.title")}
        description="Leia e edite os arquivos de personalidade, memoria e instrucao das agentes em modo leitor ou arquivo."
        stats={[
          { label: "Agentes", value: agents.length },
          { label: "Docs", value: docs.length },
          { label: "Perfil", value: selectedAgent?.name ?? "-" },
        ]}
      />
      <div className="profile-workbench">
        <aside className="panel management-list">
          <div className="panel-title"><h3>Agentes</h3><span>{agents.length}</span></div>
          <div className="tab-list">
            {agents.map((agent) => (
              <button className={(agent.id ?? agent.name) === selectedAgentId ? "is-active" : ""} key={agent.id ?? agent.name} type="button" onClick={() => setSelectedAgentId(agent.id ?? agent.name)}>
                <b>{agent.name}</b>
                <span>{agent.status} · {(groupedDocs[agent.id] ?? groupedDocs[agent.name?.toLowerCase()] ?? []).length} docs</span>
              </button>
            ))}
          </div>
        </aside>
        <aside className="panel profile-file-browser">
          <div className="panel-title"><h3>Arquivos do perfil</h3><span>{selectedFiles.length}</span></div>
          <div className="file-rail">
            {selectedFiles.map((file) => (
              <button className={file.path === selectedFile?.path ? "is-active" : ""} key={file.path} type="button" onClick={() => setSelectedPath(file.path)}>
                <b>{file.name}</b>
                <span>{file.path.split("/").slice(-3).join("/")}</span>
              </button>
            ))}
          </div>
        </aside>
        <article className="panel management-detail">
          <div className="panel-title"><h3>{selectedAgent?.name ?? "Perfil"}</h3><span>{selectedFiles.length} arquivos</span></div>
          <p className="management-summary">{selectedAgent?.currentTask ?? "sem tarefa ativa"}</p>
          <StructuredFilePanel file={selectedFile} titlePrefix="profile md" />
        </article>
      </div>
    </section>
  );
}

function Skills({ data }) {
  const { t } = useI18n();
  const skillDocs = data.hermes?.skillDocs ?? [];
  const usageSkills = data.hermes?.analytics?.skills?.length
    ? data.hermes.analytics.skills
    : (data.skills ?? []).map((name) => ({ name, use_count: 0, view_count: 0, patch_count: 0, profiles: [] }));
  const skills = useMemo(() => {
    const statsByName = new Map(usageSkills.map((skill) => [normalizeToken(skill.name), skill]));
    const fromDocs = Array.from(new Map(skillDocs.map((doc) => [doc.skill || doc.name, doc])).values())
      .map((doc) => {
        const name = doc.skill || doc.name;
        const stats = statsByName.get(normalizeToken(name));
        return {
          name,
          use_count: stats?.use_count ?? 0,
          view_count: stats?.view_count ?? 0,
          patch_count: stats?.patch_count ?? 0,
          profiles: stats?.profiles ?? [doc.profile ?? "global"],
          last_used_at: stats?.last_used_at,
          hasDoc: true,
        };
      });
    const docNames = new Set(fromDocs.map((skill) => normalizeToken(skill.name)));
    const withoutDocs = usageSkills
      .filter((skill) => !docNames.has(normalizeToken(skill.name)))
      .map((skill) => ({ ...skill, hasDoc: false }));
    return [...fromDocs, ...withoutDocs].sort((a, b) => (b.use_count ?? 0) - (a.use_count ?? 0) || String(a.name).localeCompare(String(b.name)));
  }, [usageSkills, skillDocs]);
  const [selectedSkillName, setSelectedSkillName] = useState(skills[0]?.name ?? "");
  const selectedSkill = skills.find((skill) => skill.name === selectedSkillName) ?? skills[0];
  const skillNeedle = normalizeToken(selectedSkill?.name ?? "");
  const selectedDocs = skillDocs.filter((doc) => {
    const docSkill = normalizeToken(doc.skill);
    const pathParts = String(doc.path ?? "").split("/").map(normalizeToken);
    const haystack = normalizeToken(`${doc.skill} ${doc.name} ${doc.path}`);
    return haystack.includes(skillNeedle) || skillNeedle.includes(docSkill) || pathParts.includes(skillNeedle);
  });
  const [selectedDocPath, setSelectedDocPath] = useState(selectedDocs[0]?.path ?? "");
  const selectedDoc = selectedDocs.find((doc) => doc.path === selectedDocPath) ?? selectedDocs[0] ?? (selectedSkill ? {
    name: `${selectedSkill.name}.usage.json`,
    skill: selectedSkill.name,
    profile: listText(selectedSkill.profiles),
    type: "json",
    path: `hermes://skills/${selectedSkill.name}/usage-aggregate`,
    source: "analytics/.usage aggregate",
    readonly: true,
    content: `${JSON.stringify({
      name: selectedSkill.name,
      use_count: selectedSkill.use_count ?? 0,
      view_count: selectedSkill.view_count ?? 0,
      patch_count: selectedSkill.patch_count ?? 0,
      profiles: selectedSkill.profiles ?? [],
      last_used_at: selectedSkill.last_used_at ?? null,
      note: "Registro real agregado a partir dos .usage.json do Hermes. Nao foi encontrado SKILL.md para esta skill.",
      suggested_skill_path: `${data.hermes?.hermesHome ?? "~/.hermes"}/skills/${selectedSkill.name}/SKILL.md`,
    }, null, 2)}\n`,
  } : null);
  const [skillDraft, setSkillDraft] = useState(selectedDoc?.content ?? "");
  const [skillStatus, setSkillStatus] = useState("");

  useEffect(() => {
    if (!skills.some((skill) => skill.name === selectedSkillName)) setSelectedSkillName(skills[0]?.name ?? "");
  }, [skills.map((skill) => skill.name).join("|"), selectedSkillName]);

  useEffect(() => {
    if (!selectedDocs.some((doc) => doc.path === selectedDocPath)) setSelectedDocPath(selectedDocs[0]?.path ?? "");
  }, [selectedSkillName, selectedDocs.map((doc) => doc.path).join("|"), selectedDocPath]);

  useEffect(() => {
    setSkillDraft(selectedDoc?.content ?? "");
    setSkillStatus("");
  }, [selectedDoc?.path, selectedDoc?.content]);

  async function saveSkillDoc() {
    if (!selectedDoc?.path) return;
    if (selectedDoc.readonly || String(selectedDoc.path).includes("#")) {
      setSkillStatus("Registro real de uso em modo leitura. Crie/abra um SKILL.md para editar a definicao.");
      return;
    }
    setSkillStatus("Salvando skill via SSH...");
    try {
      const result = await saveHermesFile(selectedDoc.path, skillDraft);
      setSkillStatus(result.saved ? `Salvo em ${result.path || selectedDoc.path}` : `Falha ao salvar: ${result.error || "sem detalhe"}`);
    } catch (error) {
      setSkillStatus(`Falha ao salvar: ${error.message}`);
    }
  }

  return (
    <section className="view is-active admin-page">
      <AdminHero
        eyebrow={`§10 / ${t("section.skills.eyebrow")}`}
        title={t("section.skills.title")}
        description="Cruza uso real das skills com arquivos encontrados na VPS; quando nao ha SKILL.md, mostra o registro real de uso."
        stats={[
          { label: "Skills", value: skills.length },
          { label: "Arquivos", value: skillDocs.length },
          { label: "Selecionada", value: selectedSkill?.name ?? "-" },
        ]}
      />
      <div className="skill-workbench">
        <aside className="panel management-list">
          <div className="panel-title"><h3>Skills</h3><span>{skills.length}</span></div>
          <div className="tab-list">
            {skills.map((skill) => (
              <button className={skill.name === selectedSkill?.name ? "is-active" : ""} key={skill.name} type="button" onClick={() => setSelectedSkillName(skill.name)}>
                <b>{skill.name}</b>
                <span>{skill.hasDoc ? "arquivo real" : "uso sem arquivo"} · {skill.use_count ?? 0} uses · {listText(skill.profiles)}</span>
              </button>
            ))}
          </div>
        </aside>
        <aside className="panel profile-file-browser">
          <div className="panel-title"><h3>Arquivos</h3><span>{selectedDocs.length}</span></div>
          <div className="file-rail">
            {selectedDocs.length ? selectedDocs.map((doc) => (
              <button className={doc.path === selectedDoc?.path ? "is-active" : ""} key={doc.path} type="button" onClick={() => setSelectedDocPath(doc.path)}>
                <b>{doc.name}</b>
                <span>{doc.path.split("/").slice(-3).join("/")}</span>
              </button>
            )) : (
              <button className="is-active" type="button">
                <b>Uso agregado</b>
                <span>analytics + .usage.json</span>
              </button>
            )}
          </div>
        </aside>
        <article className="panel management-detail">
          <div className="panel-title"><h3>{selectedSkill?.name ?? "Skill"}</h3><span>{selectedDocs.length ? "conteudo" : "uso"}</span></div>
          <ObjectFacts data={{
            use: selectedSkill?.use_count ?? 0,
            views: selectedSkill?.view_count ?? 0,
            patches: selectedSkill?.patch_count ?? 0,
            perfis: listText(selectedSkill?.profiles),
          }} />
          {selectedDoc ? (
            <>
              {!selectedDocs.length ? <p className="management-summary">Nao encontrei SKILL.md para esta skill. Exibindo o registro real agregado de uso do Hermes para voce decidir se cria uma definicao formal.</p> : null}
              {selectedDoc.source?.includes("usage") ? (
                <div className="skill-definition-panel">
                  <div>
                    <span>Registro real</span>
                    <h3>{selectedSkill?.name}</h3>
                    <p>Esta skill tem uso real no Hermes, mas o coletor encontrou apenas o registro `.usage.json`. O conteúdo abaixo é uma leitura humana do uso; para editar comportamento, crie o `SKILL.md` no caminho sugerido.</p>
                  </div>
                  <div className="skill-summary-grid">
                    {skillUsageSummary(selectedSkill, selectedDoc).map((item) => (
                      <p key={item.label}><span>{item.label}</span><b>{item.value}</b></p>
                    ))}
                  </div>
                </div>
              ) : null}
              <ObjectFacts data={{
                arquivo: selectedDoc.name,
                path: selectedDoc.path,
                fonte: selectedDoc.source ?? "arquivo",
                tipo: fileKind(selectedDoc),
                chars: skillDraft.length,
              }} />
              <div className="document-reader skill-reader">
                <aside>
                  <span>Sumario</span>
                  {markdownOutline(skillDraft).length ? markdownOutline(skillDraft).map((item) => <b key={item}>{item}</b>) : <b>Sem headings</b>}
                </aside>
                <div className="document-copy">
                  {markdownPreviewBlocks(skillDraft).map((block, index) => (
                    /^#{1,4}\s+/.test(block) ? <h4 key={`${block}-${index}`}>{block.replace(/^#{1,4}\s+/, "")}</h4> : <p key={`${block}-${index}`}>{block}</p>
                  ))}
                </div>
              </div>
              <div className="api-form single-column-form compact-editor">
                <label>Editar conteudo<textarea value={skillDraft} onChange={(event) => setSkillDraft(event.target.value)} /></label>
              </div>
              <div className="api-editor-actions">
                <button className="primary-button" type="button" onClick={saveSkillDoc}>Salvar arquivo</button>
                {skillStatus ? <span className="inline-status">{skillStatus}</span> : null}
              </div>
            </>
          ) : null}
        </article>
      </div>
    </section>
  );
}

function Cron({ data }) {
  const { t } = useI18n();
  const jobs = data.hermes?.jobs?.length ? data.hermes.jobs : [];
  const [selectedId, setSelectedId] = useState(jobs[0]?.id ?? "");
  const selectedJob = jobs.find((job) => job.id === selectedId) ?? jobs[0];
  const [cronFields, setCronFields] = useState(cronFieldsFromJob(selectedJob));
  const [systemdCalendar, setSystemdCalendar] = useState(systemdCalendarFromSchedule(selectedJob?.schedule));
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!jobs.some((job) => job.id === selectedId)) setSelectedId(jobs[0]?.id ?? "");
  }, [jobs.map((job) => job.id).join("|"), selectedId]);

  useEffect(() => {
    setCronFields(cronFieldsFromJob(selectedJob));
    setSystemdCalendar(systemdCalendarFromSchedule(selectedJob?.schedule));
    setStatus("");
  }, [selectedJob?.id]);

  async function saveCron() {
    setStatus("Salvando cron via SSH...");
    try {
      const result = await saveHermesCron(selectedJob?.raw ?? cronLineFromFields(cronFieldsFromJob(selectedJob)), cronLineFromFields(cronFields));
      setStatus(result.saved ? "Cron salvo." : `Falha: ${result.output || "sem detalhe"}`);
    } catch (error) {
      setStatus(`Falha: ${error.message}`);
    }
  }

  async function saveSystemdTimer() {
    setStatus("Salvando override systemd via SSH...");
    try {
      const result = await saveHermesSystemdTimer(selectedJob?.unit, systemdCalendar);
      setStatus(result.saved ? `Timer salvo: ${result.output}` : `Falha: ${result.output || "sem detalhe"}`);
    } catch (error) {
      setStatus(`Falha: ${error.message}`);
    }
  }

  function updateCronField(field, value) {
    setCronFields((current) => ({ ...current, [field]: value }));
  }

  return (
    <section className="view is-active admin-page">
      <AdminHero
        eyebrow={`§11 / ${t("section.cron.eyebrow")}`}
        title={t("section.cron.title")}
        description="Gerencie crontab e timers systemd com presets de horario, preview da linha final e salvamento via SSH."
        stats={[
          { label: "Jobs", value: jobs.length },
          { label: "Tipo", value: selectedJob?.source ?? "-" },
          { label: "Status", value: selectedJob?.status ?? "-" },
        ]}
      />
      <div className="management-layout">
        <aside className="panel management-list">
          <div className="panel-title"><h3>Jobs</h3><span>{jobs.length}</span></div>
          <div className="tab-list">
            {jobs.map((job) => (
              <button className={job.id === selectedJob?.id ? "is-active" : ""} key={job.id} type="button" onClick={() => setSelectedId(job.id)}>
                <b>{job.source}</b>
                <span>{job.schedule}</span>
              </button>
            ))}
          </div>
        </aside>
        <article className="panel management-detail">
          <div className="panel-title"><h3>{selectedJob?.source ?? "Cron"}</h3><span>{selectedJob?.status ?? "snapshot"}</span></div>
          <ObjectFacts data={{ schedule: selectedJob?.schedule, source: selectedJob?.source, status: selectedJob?.status }} />
          {selectedJob?.source === "crontab" ? (
            <>
              <div className="cron-builder">
                <label><span>Minuto</span><input value={cronFields.minute} onChange={(event) => updateCronField("minute", event.target.value)} /></label>
                <label><span>Hora</span><input value={cronFields.hour} onChange={(event) => updateCronField("hour", event.target.value)} /></label>
                <label><span>Dia</span><input value={cronFields.dayOfMonth} onChange={(event) => updateCronField("dayOfMonth", event.target.value)} /></label>
                <label><span>Mes</span><input value={cronFields.month} onChange={(event) => updateCronField("month", event.target.value)} /></label>
                <label><span>Semana</span><input value={cronFields.dayOfWeek} onChange={(event) => updateCronField("dayOfWeek", event.target.value)} /></label>
                <label className="wide"><span>Comando</span><input value={cronFields.command} onChange={(event) => updateCronField("command", event.target.value)} /></label>
              </div>
              <div className="cron-preview"><span>linha final</span><code>{cronLineFromFields(cronFields)}</code></div>
              <div className="api-editor-actions">
                <button className="primary-button" type="button" onClick={saveCron}>Salvar cron</button>
                {status ? <span className="inline-status">{status}</span> : null}
              </div>
            </>
          ) : selectedJob ? (
            <div className="systemd-editor">
              <div className="cron-systemd-note">
                <b>{selectedJob.unit}</b>
                <p>Timer systemd detectado. O Mission Control salva um override em /etc/systemd/system com OnCalendar, recarrega o daemon e reinicia o timer.</p>
                <code>{selectedJob.raw}</code>
              </div>
              <div className="cron-builder systemd-builder">
                <label className="wide"><span>OnCalendar</span><input value={systemdCalendar} onChange={(event) => setSystemdCalendar(event.target.value)} placeholder="*-*-* 09:00:00" /></label>
              </div>
              <div className="preset-row">
                {[
                  ["Diario 09:00", "*-*-* 09:00:00"],
                  ["Seg-Sex 08:30", "Mon..Fri *-*-* 08:30:00"],
                  ["Semanal", "Mon *-*-* 09:00:00"],
                  ["Mensal", "*-*-01 09:00:00"],
                ].map(([label, value]) => <button className="ghost-button" key={value} type="button" onClick={() => setSystemdCalendar(value)}>{label}</button>)}
              </div>
              <div className="api-editor-actions">
                <button className="primary-button" type="button" onClick={saveSystemdTimer}>Salvar timer</button>
                {status ? <span className="inline-status">{status}</span> : null}
              </div>
            </div>
          ) : null}
          <pre className="okami-pre">{data.hermes?.jobRaw || "Sem saida coletada."}</pre>
        </article>
      </div>
    </section>
  );
}

function Logs({ data }) {
  const { t } = useI18n();
  const logs = data.hermes?.logLines?.length ? data.hermes.logLines : data.activity?.map((item) => `${item.actor}: ${item.message}`) ?? [];
  const events = data.hermes?.analytics?.events ?? [];
  const [query, setQuery] = useState("");
  const [toneFilter, setToneFilter] = useState("todos");
  const filteredLogs = logs.filter((line) => line.toLowerCase().includes(query.toLowerCase()));
  const filteredEvents = events.filter((event) => summarizeRecord(event).toLowerCase().includes(query.toLowerCase()) || String(event.profile ?? "").toLowerCase().includes(query.toLowerCase()));
  const parsedLogs = filteredLogs.map(readableLogLine).filter((log) => toneFilter === "todos" || log.tone === toneFilter);
  const toneCounts = logs.map(readableLogLine).reduce((counts, log) => {
    counts[log.tone] = (counts[log.tone] ?? 0) + 1;
    return counts;
  }, {});

  return (
    <section className="view is-active admin-page">
      <AdminHero
        eyebrow={`§12 / ${t("section.logs.eyebrow")}`}
        title={t("section.logs.title")}
        description="Logs recentes e eventos do state.db formatados para leitura humana, com busca e severidade visual."
        stats={[
          { label: "Logs", value: logs.length },
          { label: "Eventos", value: events.length },
          { label: "Filtro", value: query || "todos" },
        ]}
      />
      <div className="ok-filter-bar" role="search" aria-label="Filtros de logs">
        <label className="ok-filter-bar__field ok-filter-bar__field--search">
          <span className="ok-filter-bar__label">Buscar</span>
          <span className="ok-filter-bar__input-wrap">
            <span className="ok-filter-bar__icon" aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="termos em logs e eventos…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query ? (
              <button
                type="button"
                className="ok-filter-bar__clear"
                aria-label="Limpar busca"
                onClick={() => setQuery("")}
              >✕</button>
            ) : null}
          </span>
        </label>
        <div className="ok-filter-bar__field ok-filter-bar__field--pills">
          <span className="ok-filter-bar__label">Severidade</span>
          <div className="ok-filter-bar__pills">
            {[
              ["todos",  "todos",  logs.length],
              ["danger", "danger", toneCounts.danger ?? 0],
              ["warn",   "warn",   toneCounts.warn ?? 0],
              ["ok",     "ok",     toneCounts.ok ?? 0],
              ["info",   "info",   toneCounts.info ?? 0],
            ].map(([key, label, count]) => (
              <button
                className={`ok-filter-pill tone-${key} ${toneFilter === key ? "is-active" : ""}`}
                key={key}
                type="button"
                onClick={() => setToneFilter(key)}
              >
                <span>{label}</span>
                <small>{count}</small>
              </button>
            ))}
          </div>
        </div>
        <div className="ok-filter-bar__result">
          <span>{parsedLogs.length}</span>
          <small>de {logs.length} logs</small>
        </div>
      </div>
      <div className="logs-layout">
        <article className="panel">
          <div className="panel-title"><h3>Logs recentes</h3><span>{parsedLogs.length} lines</span></div>
          <div className="readable-log-list">
            {parsedLogs.map((log, index) => (
              <div className={`tone-${log.tone}`} key={`${log.message}-${index}`}>
                <span>{log.time}</span>
                <b>{log.source}</b>
                <em>{log.tone}</em>
                <article>
                  <strong>{log.format}</strong>
                  <p>{log.message}</p>
                  {log.details.length ? (
                    <ul>
                      {log.details.slice(0, 4).map((detail) => <li key={detail}>{detail}</li>)}
                    </ul>
                  ) : null}
                  {log.raw && log.raw !== log.message ? (
                    <details>
                      <summary>ver bruto</summary>
                      <pre>{log.raw}</pre>
                    </details>
                  ) : null}
                </article>
              </div>
            ))}
          </div>
        </article>
        <article className="panel">
          <div className="panel-title"><h3>Eventos state.db</h3><span>{filteredEvents.length} messages</span></div>
          <div className="readable-event-list">
            {filteredEvents.slice(0, 36).map((event, index) => (
              <div key={`${event.id ?? index}-${event.created_at}`}>
                <header>
                  <b>{event.profile ?? event.role ?? "event"}</b>
                  <span>{recordTime(event) || event.tool_name || "state.db"}</span>
                </header>
                <small>{event.type ?? event.role ?? event.tool_name ?? "state.db"}</small>
                <p>{summarizeRecord(event).slice(0, 260)}</p>
              </div>
            ))}
          </div>
          <div className="api-editor-actions"><button className="primary-button" type="button" onClick={() => window.localStorage.setItem("okami.logs.query", query)}>Salvar filtro</button></div>
        </article>
      </div>
    </section>
  );
}

function Sessions({ data }) {
  const { t } = useI18n();
  const sessions = data.hermes?.sessions?.length ? data.hermes.sessions : data.hermes?.analytics?.recent ?? [];
  const [query, setQuery] = useState("");
  const [profileFilter, setProfileFilter] = useState("todos");
  const [selectedSession, setSelectedSession] = useState(null);
  const profiles = ["todos", ...Array.from(new Set(sessions.map((session) => session.profile ?? "default")))];
  const filtered = sessions.filter((session) => {
    const haystack = `${session.profile} ${session.status} ${session.model} ${session.title} ${session.source} ${session.id}`.toLowerCase();
    return haystack.includes(query.toLowerCase()) && (profileFilter === "todos" || (session.profile ?? "default") === profileFilter);
  });
  const active = filtered.filter((session) => sessionStatus(session) === "active");
  const inactive = filtered.filter((session) => sessionStatus(session) !== "active");

  useEffect(() => {
    if (!selectedSession || !filtered.some((session) => session.id === selectedSession.id)) {
      setSelectedSession(active[0] ?? inactive[0] ?? null);
    }
  }, [filtered.map((session) => session.id).join("|")]);

  function SessionList({ title, items, tone }) {
    const tokenTotal = items.reduce((sum, session) => sum + Number(session.tokens ?? 0), 0);
    const toolTotal = items.reduce((sum, session) => sum + Number(session.tool_call_count ?? 0), 0);
    return (
      <article className={`panel data-table-panel session-section tone-${tone}`}>
        <div className="panel-title"><h3>{title}</h3><span>{items.length} registros</span></div>
        <div className="session-section-stats">
          <span>{formatTokenValue(tokenTotal)}</span>
          <span>{toolTotal} tools</span>
          <span>{items[0]?.profile ?? "sem perfil"}</span>
        </div>
        <div className="session-card-list">
          {items.map((session) => (
            <button className={selectedSession?.id === session.id ? "is-active" : ""} type="button" key={session.id} onClick={() => setSelectedSession(session)}>
              <span className="session-row-rail"></span>
              <div className="session-row-main">
                <header>
                  <b>{session.title ?? session.profile ?? "default"}</b>
                  <em className={`session-pill tone-${sessionStatus(session)}`}>{sessionStatus(session)}</em>
                </header>
                <span>{session.profile ?? "default"} · {session.model ?? "unknown"} · {session.source ?? "cli"}</span>
                <p>{session.id}</p>
              </div>
              <footer>
                <strong>{formatTokenValue(session.tokens ?? 0)}</strong>
                <i>{sessionDuration(session)}</i>
                <small>{session.tool_call_count ?? 0} tools</small>
              </footer>
            </button>
          ))}
        </div>
      </article>
    );
  }

  return (
    <section className="view is-active admin-page">
      <AdminHero
        eyebrow={`§13 / ${t("section.sessions.eyebrow")}`}
        title={t("section.sessions.title")}
        description="Separe sessões vivas e encerradas, filtre por perfil e abra o detalhe no painel lateral."
        stats={[
          { label: "Ativas", value: active.length },
          { label: "Inativas", value: inactive.length },
          { label: "Total", value: sessions.length },
        ]}
      />
      <div className="ok-filter-bar" role="search" aria-label="Filtros de sessão">
        <label className="ok-filter-bar__field ok-filter-bar__field--search">
          <span className="ok-filter-bar__label">Buscar</span>
          <span className="ok-filter-bar__input-wrap">
            <span className="ok-filter-bar__icon" aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="perfil, modelo, id, source…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query ? (
              <button
                type="button"
                className="ok-filter-bar__clear"
                aria-label="Limpar busca"
                onClick={() => setQuery("")}
              >✕</button>
            ) : null}
          </span>
        </label>
        <label className="ok-filter-bar__field">
          <span className="ok-filter-bar__label">Perfil</span>
          <select value={profileFilter} onChange={(event) => setProfileFilter(event.target.value)}>
            {profiles.map((profile) => <option key={profile} value={profile}>{profile}</option>)}
          </select>
        </label>
        <div className="ok-filter-bar__result">
          <span>{filtered.length}</span>
          <small>de {sessions.length} sessões</small>
        </div>
      </div>
      <div className="sessions-workspace">
        <div className="sessions-stack">
          <SessionList title="Ativas" items={active} tone="active" />
          <SessionList title="Inativas" items={inactive} tone="inactive" />
        </div>
        <aside className="panel session-side-panel">
          <div className="panel-title"><h3>{selectedSession?.title ?? "Detalhe da sessao"}</h3><span>{selectedSession ? selectedSession.status : "selecione"}</span></div>
          {selectedSession ? (
            <>
              <div className="session-focus">
                <span className={`session-pill tone-${sessionStatus(selectedSession)}`}>{sessionStatus(selectedSession)}</span>
                <h3>{selectedSession.title ?? selectedSession.source ?? selectedSession.id}</h3>
                <p>{selectedSession.id}</p>
                <div className="session-token-meter">
                  {sessionTokenParts(selectedSession).map((part) => (
                    <i className={`tone-${part.color}`} style={{ width: `${part.width}%` }} title={`${part.label}: ${part.value}`} key={part.label}></i>
                  ))}
                </div>
              </div>
              <div className="session-command-strip">
                <div><span>Profile</span><b>{selectedSession.profile ?? "default"}</b></div>
                <div><span>Model</span><b>{selectedSession.model ?? "-"}</b></div>
                <div><span>Tokens</span><b>{formatTokenValue(selectedSession.tokens ?? 0)}</b></div>
                <div><span>Duração</span><b>{sessionDuration(selectedSession)}</b></div>
              </div>
              <div className="session-breakdown">
                {sessionTokenParts(selectedSession).map((part) => (
                  <div key={part.label}>
                    <span>{part.label}</span>
                    <b>{formatTokenValue(part.value)}</b>
                    <i><em className={`tone-${part.color}`} style={{ width: `${part.width}%` }}></em></i>
                  </div>
                ))}
              </div>
              <div className="session-timeline">
                <div><span>Started</span><b>{recordTime({ started_at: selectedSession.started_at })}</b></div>
                <div><span>Ended</span><b>{selectedSession.ended_at ? recordTime({ started_at: selectedSession.ended_at }) : "ativa"}</b></div>
              </div>
              <div className="session-readable">
                <p><b>Fonte</b><span>{selectedSession.source ?? "cli"}</span></p>
                <p><b>Mensagens</b><span>{selectedSession.message_count ?? 0}</span></p>
                <p><b>Tool calls</b><span>{selectedSession.tool_call_count ?? 0}</span></p>
                <p><b>Input</b><span>{formatTokenValue(selectedSession.input_tokens ?? 0)}</span></p>
                <p><b>Output</b><span>{formatTokenValue(selectedSession.output_tokens ?? 0)}</span></p>
                <p><b>Cache</b><span>{formatTokenValue(selectedSession.cache_read_tokens ?? 0)}</span></p>
                <p><b>Custo</b><span>{selectedSession.actual_cost_usd ?? selectedSession.estimated_cost_usd ?? 0}</span></p>
              </div>
            </>
          ) : <p className="management-summary">Clique em uma sessao para abrir o detalhe aqui, sem modal.</p>}
        </aside>
      </div>
      <div className="api-editor-actions"><button className="primary-button" type="button" onClick={() => window.localStorage.setItem("okami.sessions.filters", JSON.stringify({ query, profileFilter }))}>Salvar filtros</button></div>
    </section>
  );
}

function Hermes({ data, embedded = false, ensurePanelAccess = async () => true }) {
  const { t } = useI18n();
  const toast = useToast();
  const [config, setConfig] = useState(() => {
    try {
      if (isMissionApiConfigured()) return data.hermes;
      const savedConfig = window.localStorage.getItem("okami.hermes.config");
      return savedConfig ? { ...data.hermes, ...JSON.parse(savedConfig) } : data.hermes;
    } catch {
      return data.hermes;
    }
  });
	  const [status, setStatus] = useState(() => ({
	    tone: isMissionApiConfigured() ? "idle" : "warn",
	    message: isMissionApiConfigured()
	      ? "Configure o SSH do servidor onde os agentes rodam. Ele alimenta arquivos, comandos, Kanban e logs do dashboard."
	      : "Modo demo/local: testes nao validam o servidor real dos agentes.",
	  }));
		  const [keyDraft, setKeyDraft] = useState({ name: "servidor-agentes", passphrase: "" });
	  const [selectedKeyFile, setSelectedKeyFile] = useState(null);
	  const [connectBusy, setConnectBusy] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState("");

  useEffect(() => {
    const { sshPassword, ...persistableConfig } = config;
    try {
      if (!isMissionApiConfigured()) {
        window.localStorage?.setItem("okami.hermes.config", JSON.stringify(persistableConfig));
      }
    } catch {
      // Some embedded browser contexts disable storage; the backend remains the source of truth.
    }
  }, [config]);

  useEffect(() => {
    let active = true;

    async function loadServerConfig() {
      if (!isMissionApiConfigured()) return;
      if (!getMissionApiToken() && !import.meta.env.PROD && !isMissionApiLocalDev()) return;
      try {
        const serverConfig = await getHermesConfig();
        if (active && serverConfig) {
          setConfig((current) => ({ ...current, ...serverConfig }));
        }
      } catch {
        // Sem key ainda ou API fora do ar. O painel de acesso mostra o proximo passo.
      }
    }

    loadServerConfig();
    window.addEventListener("okami-api-token-change", loadServerConfig);
    return () => {
      active = false;
      window.removeEventListener("okami-api-token-change", loadServerConfig);
    };
  }, []);

		  function updateHermesConfig(field, value) {
		    setConfig((current) => ({ ...current, [field]: value }));
		    setStatus({ tone: "dirty", message: "Configuracao alterada localmente. Salve para enviar ao servidor." });
		  }

	  function selectKeyFile(event) {
	    const file = event.target.files?.[0] ?? null;
	    if (!file) {
	      setSelectedKeyFile(null);
	      return;
	    }

	    if (file.name.endsWith(".pub")) {
	      setSelectedKeyFile(null);
	      setStatus({ tone: "warn", message: "Essa e a chave publica (.pub). Selecione a chave privada, como id_ed25519, id_rsa ou .pem." });
	      event.target.value = "";
	      return;
	    }

	    setSelectedKeyFile(file);
	    setKeyDraft((current) => ({ ...current, name: current.name || file.name }));
	    setStatus({ tone: "dirty", message: `Chave ${file.name} pronta para conectar.` });
	  }

	  async function connectServer() {
	    if (!String(config.sshHost || "").trim() || !String(config.sshUser || "").trim()) {
	      setStatus({ tone: "warn", message: "Informe SSH host e SSH user para conectar." });
	      return;
	    }

	    setConnectBusy(true);
	    setStatus({ tone: "pending", message: "Conectando servidor dos agentes..." });
	    try {
	      const hasAccess = await ensurePanelAccess();
	      if (!hasAccess) {
	        setStatus({ tone: "warn", message: "Nao consegui preparar o acesso do painel para conectar o servidor." });
	        return;
	      }

	      let nextConfig = { ...config };
	      if (nextConfig.sshAuthMethod === "key") {
	        if (selectedKeyFile) {
	          setStatus({ tone: "pending", message: "Guardando chave SSH no cofre..." });
	          const privateKey = await selectedKeyFile.text();
	          const result = await uploadHermesSshKey({
	            name: keyDraft.name || selectedKeyFile.name,
	            privateKey,
	            passphrase: keyDraft.passphrase,
	          });
	          nextConfig = {
	            ...nextConfig,
	            sshAuthMethod: "key",
	            sshKeyPath: result.keyRef ?? `vault://ssh-key/${result.keyId}`,
	            sshKeyFingerprint: result.fingerprint,
	            sshKeyStorage: result.storage,
	          };
	          setConfig(nextConfig);
	          setSelectedKeyFile(null);
	        } else if (!nextConfig.sshKeyPath) {
	          setStatus({ tone: "warn", message: "Selecione a chave privada SSH para conectar." });
	          return;
	        }
	      } else if (nextConfig.sshAuthMethod === "password") {
	        if (passwordDraft) {
	          setStatus({ tone: "pending", message: "Guardando senha SSH no cofre..." });
	          const result = await saveHermesSshPassword({
	            host: nextConfig.sshHost,
	            user: nextConfig.sshUser,
	            port: nextConfig.sshPort,
	            password: passwordDraft,
	          });
	          nextConfig = {
	            ...nextConfig,
	            sshAuthMethod: "password",
	            sshPasswordRef: result.passwordRef,
	          };
	          setConfig(nextConfig);
	          setPasswordDraft("");
	        } else if (!nextConfig.sshPasswordRef) {
	          setStatus({ tone: "warn", message: "Informe a senha SSH para conectar." });
	          return;
	        }
	      }

	      setStatus({ tone: "pending", message: "Salvando e testando SSH..." });
	      await saveHermesConfig(nextConfig);
	      const result = await testHermesSshConnection({
	        ...nextConfig,
	        sshPassword: nextConfig.sshAuthMethod === "password" ? passwordDraft : undefined,
	      });
	      const isOk = Boolean(result.ok);
	      setStatus({
	        tone: isOk ? "ok" : "warn",
	        message: isOk
	          ? `Servidor conectado. Latencia ${result.latency ?? "sem latencia"}.`
	          : `Config salva, mas o teste SSH falhou: ${result.message}`,
	      });
	      if (isOk) toast.success("Servidor conectado", `SSH validado em ${nextConfig.sshHost}.`);
	      else toast.warning("SSH com aviso", result.message);
	    } catch (error) {
	      setStatus({ tone: "warn", message: `Falha ao conectar servidor: ${error.message}` });
	      toast.danger("Falha ao conectar servidor", error.message);
	    } finally {
	      setConnectBusy(false);
	    }
	  }

		  async function saveConfig() {
	    setStatus({ tone: "pending", message: "Salvando conexao SSH dos agentes..." });
	    try {
	      await saveHermesConfig(config);
	      const live = isMissionApiConfigured();
	      const message = live
	        ? "Conexao SSH salva. O servidor pode ler arquivos remotos e aplicar acessos de agentes automaticamente."
	        : "Conexao salva localmente no navegador. Inicie a API local para validar o servidor real.";
	      setStatus({ tone: live ? "ok" : "warn", message });
	      if (live) toast.success("Conexao SSH salva", "Servidor recebeu a configuracao dos agentes.");
	      else toast.warning("Salvo só localmente", "Inicie a API local para validar o servidor real.");
	    } catch (error) {
	      setStatus({ tone: "warn", message: `Falha ao salvar conexao SSH: ${error.message}` });
	      toast.danger("Falha ao salvar SSH", error.message);
	    }
	  }

  async function testSsh() {
    setStatus({ tone: "pending", message: `Testando SSH em ${config.sshUser}@${config.sshHost}:${config.sshPort}...` });
    toast.info("Testando SSH", `${config.sshUser}@${config.sshHost}:${config.sshPort}`);
    try {
      const result = await testHermesSshConnection({
        ...config,
        sshPassword: config.sshAuthMethod === "password" ? passwordDraft : undefined,
      });
      const live = isMissionApiConfigured();
      const isOk = Boolean(result.ok && live);
      setStatus({
        tone: isOk ? "ok" : "warn",
        message: `${result.message} · ${result.latency ?? "sem latencia"}${live ? "" : " · demo"}`,
      });
      if (isOk) toast.success("SSH validado", `Latência ${result.latency ?? "—"}`);
      else if (live) toast.warning("SSH com aviso", result.message);
    } catch (error) {
      setStatus({ tone: "warn", message: `Falha no SSH: ${error.message}` });
      toast.danger("Falha no SSH", error.message);
    }
  }

  async function savePassword() {
    if (!passwordDraft) {
      setStatus({ tone: "warn", message: "Informe a senha SSH antes de salvar no cofre." });
      return;
    }

	    setStatus({ tone: "pending", message: "Salvando senha SSH no cofre do servidor..." });
    try {
      const result = await saveHermesSshPassword({
        host: config.sshHost,
        user: config.sshUser,
        port: config.sshPort,
        password: passwordDraft,
      });
      setConfig((current) => ({
        ...current,
        sshAuthMethod: "password",
        sshPasswordRef: result.passwordRef,
      }));
      setPasswordDraft("");
      setStatus({
	        tone: isMissionApiConfigured() ? "ok" : "warn",
	        message: isMissionApiConfigured()
	          ? "Senha salva no cofre do servidor. Menos seguro que chave SSH, use so para teste."
	          : "Senha salva apenas no modo demo/local. Inicie a API local para persistir de verdade.",
	      });
    } catch (error) {
      setStatus({ tone: "warn", message: `Falha ao salvar senha: ${error.message}` });
    }
  }

  async function uploadKey(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith(".pub")) {
      setStatus({ tone: "warn", message: "Essa e a chave publica (.pub). Para conectar, envie a chave privada, como id_ed25519, id_rsa ou .pem." });
      event.target.value = "";
      return;
    }

	    setStatus({ tone: "pending", message: "Enviando chave SSH para o cofre do servidor..." });
    try {
      const privateKey = await file.text();
      const result = await uploadHermesSshKey({
        name: keyDraft.name || file.name,
        privateKey,
        passphrase: keyDraft.passphrase,
      });
      setConfig((current) => ({
        ...current,
        sshAuthMethod: "key",
        sshKeyPath: result.keyRef ?? `vault://ssh-key/${result.keyId}`,
        sshKeyFingerprint: result.fingerprint,
        sshKeyStorage: result.storage,
      }));
      setStatus({
	        tone: isMissionApiConfigured() ? "ok" : "warn",
	        message: isMissionApiConfigured()
	          ? `Chave salva no cofre como ${result.keyId}. O navegador guarda apenas keyId e fingerprint.`
	          : `Chave registrada em demo como ${result.keyId}. Sem API local, isso persiste so como referencia local.`,
	      });
    } catch (error) {
      setStatus({ tone: "warn", message: `Falha ao enviar chave: ${error.message}` });
    } finally {
      event.target.value = "";
    }
  }

  const routeGroups = config.routes.reduce((groups, route) => {
    const group = route.group ?? "Core";
    return { ...groups, [group]: [...(groups[group] ?? []), route] };
  }, {});

		  return (
		    <section className={embedded ? "config-embedded-block hermes-embedded" : "view is-active"}>
		      <SectionHead eyebrow={embedded ? t("section.hermes.eyebrow") : `§08 / ${t("section.hermes.eyebrow")}`} title={embedded ? t("section.hermes.embeddedTitle") : t("section.hermes.title")}>
		        <button className="primary-button" disabled={connectBusy} onClick={connectServer} type="button">
		          {connectBusy ? "Conectando..." : "Conectar servidor"}
		        </button>
		      </SectionHead>

		      <div className="hermes-grid">
		        <div className="settings-panel panel">
		          <div className="panel-title full-row"><h3>Conexao SSH do servidor</h3><span>agentes remotos</span></div>
		          <label>SSH host<input value={config.sshHost} onChange={(event) => updateHermesConfig("sshHost", event.target.value)} /></label>
		          <label>SSH user<input value={config.sshUser} onChange={(event) => updateHermesConfig("sshUser", event.target.value)} /></label>
		          <label>SSH port<input type="number" value={config.sshPort} onChange={(event) => updateHermesConfig("sshPort", Number(event.target.value))} /></label>
		          <label>Pasta base dos agentes<input value={config.hermesHome} onChange={(event) => updateHermesConfig("hermesHome", event.target.value)} /></label>
		          <label>Metodo de auth<select value={config.sshAuthMethod} onChange={(event) => updateHermesConfig("sshAuthMethod", event.target.value)}><option value="key">SSH key</option><option value="password">Senha SSH</option></select></label>
	          <details className="config-advanced full-row">
	            <summary>Opcoes avancadas</summary>
	            <div className="api-form runtime-register-form">
	              <label>Key ref<input value={config.sshKeyPath} readOnly /></label>
	              <label>Executor de comandos<select value={config.terminalBackend} onChange={(event) => updateHermesConfig("terminalBackend", event.target.value)}><option>ssh</option><option>local</option><option>docker</option><option>modal</option><option>daytona</option><option>vercel_sandbox</option><option>singularity</option></select></label>
	              <label>Modo de roteamento<select value={config.routingMode} onChange={(event) => updateHermesConfig("routingMode", event.target.value)}><option>Custo + qualidade</option><option>Menor latencia</option><option>Modelo fixo</option></select></label>
	              <label>Orcamento diario<input value={config.dailyBudget} onChange={(event) => updateHermesConfig("dailyBudget", event.target.value)} /></label>
	              <label className="toggle"><input type="checkbox" checked={config.persistentShell} onChange={(event) => updateHermesConfig("persistentShell", event.target.checked)} /> Persistent shell SSH</label>
	              <label className="toggle"><input type="checkbox" checked={config.auditTrail} onChange={(event) => updateHermesConfig("auditTrail", event.target.checked)} /> Registrar auditoria</label>
	            </div>
	          </details>
	          <div className="api-editor-actions full-row">
	            <button className="primary-button" disabled={connectBusy} onClick={connectServer} type="button">
	              {connectBusy ? "Conectando..." : "Conectar servidor"}
	            </button>
	          </div>
	          <div
	            className={`ok-status-badge hermes-status-strip ${
              status.tone === "ok" ? "ok-status-badge--online"
                : status.tone === "warn" ? "ok-status-badge--warning"
                : status.tone === "pending" ? "ok-status-badge--operational"
                : "ok-status-badge--beta"
            }`}
            role="status"
            aria-live="polite"
          >
            {status.message}
          </div>
	        </div>

		        <article className="panel ssh-key-panel">
		          <div className="panel-title"><h3>Credencial SSH</h3><span>cofre seguro</span></div>
	          <div className="key-vault">
	            {config.sshAuthMethod === "key" ? (
	              <>
		                <label className="file-drop">Chave privada SSH<input onChange={selectKeyFile} type="file" /><small>{selectedKeyFile ? `Selecionada: ${selectedKeyFile.name}` : "id_ed25519, id_rsa, .pem ou .key"}</small></label>
	                <label>Passphrase opcional<input type="password" value={keyDraft.passphrase} onChange={(event) => setKeyDraft((current) => ({ ...current, passphrase: event.target.value }))} /></label>
	              </>
	            ) : (
	              <>
	                <div className="security-warning">
	                  <b>Senha SSH e menos segura</b>
	                  <span>Use apenas para teste. Para producao, prefira chave SSH com permissao limitada.</span>
	                </div>
	                <label>Senha SSH<input autoComplete="new-password" type="password" value={passwordDraft} onChange={(event) => setPasswordDraft(event.target.value)} /></label>
	              </>
	            )}
	            <details className="config-advanced">
	              <summary>Cofre e fingerprint</summary>
	              <div className="key-facts">
		                <span>metodo</span><b>{config.sshAuthMethod}</b>
		                <span>storage</span><b>{config.sshKeyStorage}</b>
		                <span>fingerprint</span><b>{config.sshKeyFingerprint}</b>
		                <span>password ref</span><b>{config.sshPasswordRef || "nao configurado"}</b>
		                <span>navegador</span><b>nao persiste private key nem senha</b>
		              </div>
	            </details>
	          </div>
	        </article>
	      </div>

	      <details className="config-advanced">
	        <summary>Detalhes tecnicos da conexao SSH</summary>
	        <div className="ops-grid">
	          <article className="panel">
	            <div className="panel-title"><h3>Feeds do dashboard</h3><span>fontes de dados</span></div>
	            <div className="storage-list">
	              {config.storage.map((item) => (
	                <div key={item.label}>
	                  <b>{item.label}</b>
	                  <code>{item.path}</code>
	                  <span>{item.detail}</span>
	                </div>
	              ))}
	            </div>
	          </article>
	          <article className="panel">
	            <div className="panel-title"><h3>Variaveis SSH</h3><span>ambiente remoto</span></div>
	            <div className="policy-list">
	              {config.requiredEnv.map((env) => (
	                <div key={env.key}>
	                  <span>{env.status}</span>
	                  <b>{env.key}</b>
	                  <em>{env.key === "TERMINAL_SSH_KEY" ? config.sshKeyPath : env.value}</em>
	                </div>
	              ))}
	            </div>
	          </article>
	          <article className="panel">
	            <div className="panel-title"><h3>Politicas</h3><span>seguranca</span></div>
	            <div className="policy-list">
	              {config.policies.map((policy) => (
	                <div key={policy.name}>
	                  <span>{policy.enabled ? "on" : "off"}</span>
	                  <b>{policy.name}</b>
	                  <em>{policy.impact}</em>
	                </div>
	              ))}
	            </div>
	          </article>
	        </div>

	        <article className="panel routes-panel">
	          <div className="panel-title"><h3>Rotas internas do dashboard</h3><span>{config.routes.length} endpoints</span></div>
	          <div className="route-groups">
	            {Object.entries(routeGroups).map(([group, routes]) => (
	              <section key={group}>
	                <h4>{group}</h4>
	                <div className="route-list">
	                  {routes.map((route) => (
	                    <div key={`${route.method}-${route.path}`}>
	                      <em>{route.method}</em>
	                      <code>{route.path}</code>
	                      <span>{route.purpose}</span>
	                    </div>
	                  ))}
	                </div>
	              </section>
	            ))}
	          </div>
	        </article>

	        <div className="ops-grid">
	          <article className="panel">
	            <div className="panel-title"><h3>Roteamento</h3><span>modelos</span></div>
	            <StatList items={config.routing} />
	          </article>
	          <article className="panel">
	            <div className="panel-title"><h3>Base documental</h3><span>agentes</span></div>
	            <div className="terminal">
	              <p><span>config</span> ~/.hermes/config.yaml para terminal, modelos e display</p>
	              <p><span>ssh</span> TERMINAL_SSH_HOST e TERMINAL_SSH_USER sao obrigatorios</p>
	              <p><span>kanban</span> ~/.hermes/kanban.db e a fonte canonica do board</p>
	              <p><span>api-server</span> /v1/runs e /health/detailed alimentam runs e activity</p>
	            </div>
	          </article>
	        </div>
	      </details>
	    </section>
	  );
	}

function Cli({ data }) {
  const { t } = useI18n();
  const [hostStatus, setHostStatus] = useState("");

  async function verifyHost() {
    setHostStatus("Verificando host Hermes via SSH...");
    try {
      const result = await runHermesCommand("hermes status");
      setHostStatus(result.output || "Hermes status executado.");
    } catch (error) {
      setHostStatus(`Falha ao verificar host: ${error.message}`);
    }
  }

  return (
    <section className="view is-active">
      <SectionHead eyebrow={`§09 / ${t("section.cli.eyebrow")}`} title={t("section.cli.title")}>
        <button className="ghost-button" type="button" onClick={verifyHost}>Verificar host</button>
      </SectionHead>
      <div className="cli-grid">
        {data.cliTools.map((tool) => (
          <article className="panel cli-card" key={tool.name}>
            <h3>{tool.name}</h3>
            <p>{tool.status} · {tool.agents} agentes · ultimo run {tool.lastRun}</p>
            <code>{tool.command} --version // {tool.version}</code>
          </article>
        ))}
      </div>
      <div className="ops-grid">
        <article className="panel">
          <div className="panel-title"><h3>Politica recomendada</h3><span>guardrails</span></div>
          <div className="terminal">
            <p><span>workspace</span> um diretorio isolado por agente</p>
            <p><span>quota</span> limite diario por CLI e por agente</p>
            <p><span>audit</span> registrar comando, cwd, diff e exit code</p>
          </div>
        </article>
      </div>
      {hostStatus ? (
        <article className="panel cli-status-panel">
          <div className="panel-title"><h3>Status do host</h3><span>ssh</span></div>
          <pre>{hostStatus}</pre>
        </article>
      ) : null}
    </section>
  );
}

const viewComponents = {
  overview: Overview,
  usage: Usage,
  office: Office,
  pixel: Pixel,
  kanban: Kanban,
  apis: Apis,
  apps: Apps,
  docs: Docs,
  config: Config,
  profiles: Profiles,
  skills: Skills,
  cron: Cron,
  logs: Logs,
  sessions: Sessions,
  cli: Cli,
};

const viewAliases = {
  agents: "config",
  hermes: "config",
};

function resolveViewId(view) {
  return viewAliases[view] ?? view;
}

export default function App() {
  const initialHashView = window.location.hash.slice(1);
  const initialView = resolveViewId(initialHashView);
  const [language, setLanguageState] = useState(initialLanguage);
  const [activeView, setActiveViewState] = useState(viewComponents[initialView] ? initialView : "overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [gatewayModalOpen, setGatewayModalOpen] = useState(false);
  const missionControl = useMissionControl();
  const ActiveView = viewComponents[activeView];
  const i18n = useMemo(() => ({
    language,
    setLanguage(value) {
      const nextLanguage = normalizeLanguage(value);
      setLanguageState(nextLanguage);
      window.localStorage?.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    },
    t(key) {
      return translations[language]?.[key] ?? translations[DEFAULT_LANGUAGE]?.[key] ?? key;
    },
  }), [language]);

  function setActiveView(view) {
    const resolvedView = resolveViewId(view);
    setActiveViewState(resolvedView);
    window.history.replaceState(null, "", `#${resolvedView}`);
  }

  useEffect(() => {
    const hashView = window.location.hash.slice(1);
    const resolvedView = resolveViewId(hashView);
    if (hashView && hashView !== resolvedView && viewComponents[resolvedView]) {
      window.history.replaceState(null, "", `#${resolvedView}`);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === "Escape") setSidebarOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  useEffect(() => {
    function syncHashView() {
      const hashView = window.location.hash.slice(1);
      const resolvedView = resolveViewId(hashView);
      if (viewComponents[resolvedView]) {
        setActiveViewState(resolvedView);
        if (hashView !== resolvedView) {
          window.history.replaceState(null, "", `#${resolvedView}`);
        }
      }
    }

    window.addEventListener("hashchange", syncHashView);
    return () => window.removeEventListener("hashchange", syncHashView);
  }, []);

  return (
    <I18nContext.Provider value={i18n}>
      <div className="app-shell" data-view={activeView}>
        <button
          className={`sidebar-backdrop ${sidebarOpen ? "is-visible" : ""}`}
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label={i18n.t("button.closeMenu")}
        />
        <Sidebar
          activeView={activeView}
          setActiveView={setActiveView}
          status={missionControl.data.status}
          open={sidebarOpen}
          setOpen={setSidebarOpen}
        />
        <main className="main">
          <Topbar
            source={missionControl.source}
            loading={missionControl.loading}
            lastSync={missionControl.lastSync}
            setOpen={setSidebarOpen}
            setActiveView={setActiveView}
            onOpenGateway={() => setGatewayModalOpen(true)}
          />
          {missionControl.error ? (
            <div className="api-warning">
              {i18n.t("warning.apiFallback")}
            </div>
          ) : null}
          <ActiveView
            data={missionControl.data}
            source={missionControl.source}
            loading={missionControl.loading}
          />
          <DetailModal title={gatewayModalOpen ? "Gateway Hermes" : ""} eyebrow="gateway operacional" onClose={() => setGatewayModalOpen(false)}>
            <GatewayDetail data={missionControl.data} />
          </DetailModal>
        </main>
      </div>
    </I18nContext.Provider>
  );
}
