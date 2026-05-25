const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
]);

function cloneProxyHeaders(request, token) {
  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  }
  headers.set("x-okami-proxy-token", token);
  headers.set("x-okami-edge", "cloudflare-pages");
  return headers;
}

export async function onRequest(context) {
  const { request, env } = context;
  const backendUrl = env.OKAMI_BACKEND_URL?.replace(/\/$/, "");
  const proxyToken = env.OKAMI_BACKEND_PROXY_TOKEN;

  if (!backendUrl || !proxyToken) {
    return Response.json(
      { error: "Mission Control backend proxy is not configured." },
      { status: 503 },
    );
  }

  const incomingUrl = new URL(request.url);
  const targetUrl = `${backendUrl}${incomingUrl.pathname}${incomingUrl.search}`;
  const init = {
    method: request.method,
    headers: cloneProxyHeaders(request, proxyToken),
    redirect: "manual",
  };

  if (! ["GET", "HEAD"].includes(request.method)) {
    init.body = request.body;
  }

  return fetch(targetUrl, init);
}
