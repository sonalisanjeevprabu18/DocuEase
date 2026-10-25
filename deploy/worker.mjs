/**
 * DocuEase site Worker.
 *
 * Serves the built React app as static assets and proxies the Python API that
 * lives on Vercel, so the browser only ever talks to this one origin. That keeps
 * the API free of CORS rules and hides its hostname from the client.
 *
 * API_ORIGIN can be overridden at deploy time with an API_ORIGIN variable.
 */

const DEFAULT_API_ORIGIN = "https://docu-ease-wqv3.vercel.app";

// Headers that belong to the edge hop, not to the upstream request.
const HOP_BY_HOP = new Set([
  "host",
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "proxy-authorization",
  "proxy-connection",
  "te",
  "trailer",
  "origin",
  "referer",
  "cf-connecting-ip",
  "cf-ipcountry",
  "cf-ray",
  "cf-visitor",
  "cdn-loop",
  "x-real-ip",
  "x-forwarded-host",
  "x-forwarded-proto",
]);

function isApiPath(pathname) {
  return (
    pathname === "/api" ||
    pathname.startsWith("/api/") ||
    pathname === "/health" ||
    pathname.startsWith("/docs") ||
    pathname.startsWith("/openapi.json")
  );
}

async function proxyToApi(request, url, apiOrigin) {
  const target = new URL(url.pathname + url.search, apiOrigin);
  const headers = new Headers();
  for (const [name, value] of request.headers) {
    if (!HOP_BY_HOP.has(name.toLowerCase())) headers.set(name, value);
  }
  const clientIp = request.headers.get("cf-connecting-ip");
  if (clientIp) headers.set("x-forwarded-for", clientIp);

  const init = { method: request.method, headers, redirect: "manual" };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  let upstream;
  try {
    upstream = await fetch(target.toString(), init);
  } catch {
    return Response.json(
      {
        error: {
          code: "provider_unavailable",
          message:
            "The DocuEase API could not be reached. Please try again in a moment.",
        },
      },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  for (const [name, value] of upstream.headers) {
    const lower = name.toLowerCase();
    // fetch already decoded the body, so these no longer describe it.
    if (lower === "content-encoding" || lower === "content-length") continue;
    if (HOP_BY_HOP.has(lower)) continue;
    responseHeaders.set(name, value);
  }
  responseHeaders.set("Cache-Control", "no-store");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

async function serveAsset(request, env, url) {
  const asset = await env.ASSETS.fetch(request);
  const wantsHtml = (request.headers.get("accept") || "").includes("text/html");
  if (asset.status === 404 && request.method === "GET" && wantsHtml) {
    // Single-page app: unknown paths render the app shell.
    const shell = await env.ASSETS.fetch(new URL("/index.html", url).toString());
    if (shell.ok) return new Response(shell.body, { status: 200, headers: shell.headers });
  }
  return asset;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const apiOrigin = env.API_ORIGIN || DEFAULT_API_ORIGIN;

    if (isApiPath(url.pathname)) return proxyToApi(request, url, apiOrigin);

    const response = await serveAsset(request, env, url);
    const guarded = new Response(response.body, response);
    guarded.headers.set("X-Content-Type-Options", "nosniff");
    guarded.headers.set("Referrer-Policy", "no-referrer");
    return guarded;
  },
};
