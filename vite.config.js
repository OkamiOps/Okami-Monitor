import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Em produção (Cloudflare Pages) o roteamento de /api é feito por
// functions/api/[[path]].js. Em desenvolvimento não havia proxy, então o
// frontend com VITE_OKAMI_API_BASE_URL=same-origin não alcançava a API local
// (porta 3001) — ficava preso no mock. Este proxy resolve o caminho de dev:
// `npm run dev:all` sobe a API (3001) e o Vite encaminha /api para ela,
// incluindo o stream SSE de mission-control.
const API_TARGET = process.env.OKAMI_DEV_API_TARGET || "http://127.0.0.1:3001";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: API_TARGET,
        changeOrigin: true,
        // SSE precisa de conexão keep-alive sem buffering.
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.setHeader("Connection", "keep-alive");
          });
        },
      },
    },
  },
});
