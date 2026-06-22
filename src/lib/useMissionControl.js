import { useEffect, useState } from "react";
import { canFetchMissionState, canUseMissionStream, getMissionControlState } from "./apiClient";
import { createDemoMissionControl } from "../data/mockMissionControl";

const DEFAULT_POLL_INTERVAL = 8000;
// Usa `/api` por padrão em dev e produção. Em dev, vite.config.js encaminha
// para a API local; em produção, functions/api/[[path]].js faz o proxy usando
// os segredos de runtime.
const rawApiBaseUrl = import.meta.env.VITE_OKAMI_API_BASE_URL
  ?? "same-origin";
const API_BASE_URL = rawApiBaseUrl === "same-origin"
  ? ""
  : rawApiBaseUrl?.replace(/\/$/, "");
const API_CONFIGURED = rawApiBaseUrl === "same-origin" || Boolean(API_BASE_URL);

export function useMissionControl() {
  const [authVersion, setAuthVersion] = useState(0);
  const [state, setState] = useState({
    data: createDemoMissionControl(),
    source: "demo",
    error: null,
    loading: true,
    lastSync: null,
  });

  useEffect(() => {
    const updateAuthVersion = () => setAuthVersion((current) => current + 1);
    window.addEventListener("okami-api-token-change", updateAuthVersion);
    return () => window.removeEventListener("okami-api-token-change", updateAuthVersion);
  }, []);

  useEffect(() => {
    let active = true;

    // Conexão ao vivo via Server-Sent Events.
    // Mantém uma conexão persistente — sem refresh agressivo no cliente.
    // Fallback para polling se SSE não estiver disponível.
    let eventSource = null;
    let pollIntervalId = null;
    let pollLoading = false;

    const applyData = (data, sourceTag = "api") => {
      if (!active) return;
      setState({
        data: data ?? createDemoMissionControl(),
        source: sourceTag,
        error: null,
        loading: false,
        lastSync: new Date().toISOString(),
      });
    };

    const applyError = (error) => {
      if (!active) return;
      setState((prev) => ({
        ...prev,
        error,
        loading: false,
        lastSync: new Date().toISOString(),
      }));
    };

    async function pollLoad() {
      if (pollLoading) return;
      pollLoading = true;
      const result = await getMissionControlState();
      pollLoading = false;
      if (!active) return;
      setState({
        ...result,
        loading: false,
        lastSync: new Date().toISOString(),
      });
    }

    function startPollingFallback() {
      const pollInterval = Number(import.meta.env.VITE_OKAMI_POLL_INTERVAL_MS) || DEFAULT_POLL_INTERVAL;
      pollLoad();
      pollIntervalId = window.setInterval(pollLoad, pollInterval);
    }

    function startStream() {
      if (!API_CONFIGURED || !canFetchMissionState()) {
        // Sem backend/token utilizavel — usa demo vivo local sem gerar 503 no console.
        const pollInterval = Number(import.meta.env.VITE_OKAMI_POLL_INTERVAL_MS) || DEFAULT_POLL_INTERVAL;
        setState({
          data: createDemoMissionControl(),
          source: "demo",
          error: null,
          loading: false,
          lastSync: new Date().toISOString(),
        });
        pollIntervalId = window.setInterval(() => {
          if (!active) return;
          setState({
            data: createDemoMissionControl(),
            source: "demo",
            error: null,
            loading: false,
            lastSync: new Date().toISOString(),
          });
        }, pollInterval);
        return;
      }

      if (!canUseMissionStream()) {
        startPollingFallback();
        return;
      }

      try {
        eventSource = new EventSource(`${API_BASE_URL}/api/mission-control/stream`);

        eventSource.addEventListener("state", (event) => {
          try {
            const parsed = JSON.parse(event.data);
            applyData(parsed, "api");
          } catch (err) {
            applyError(err);
          }
        });

        eventSource.addEventListener("error", (event) => {
          // Tenta extrair erro do payload se tiver
          if (event?.data) {
            try {
              const parsed = JSON.parse(event.data);
              applyError(new Error(parsed.message ?? "stream error"));
              return;
            } catch {}
          }
          // Conexão caiu — EventSource já tenta reconectar sozinho.
          // Se ficar fechado de vez, cai pro polling.
          if (eventSource?.readyState === EventSource.CLOSED) {
            eventSource = null;
            if (active && !pollIntervalId) startPollingFallback();
          }
        });
      } catch (err) {
        // EventSource não suportado / erro imediato — fallback.
        startPollingFallback();
      }
    }

    startStream();

    return () => {
      active = false;
      pollLoading = false;
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      if (pollIntervalId) {
        window.clearInterval(pollIntervalId);
        pollIntervalId = null;
      }
    };
  }, [authVersion]);

  return state;
}
