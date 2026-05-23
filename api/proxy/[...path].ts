// Minimal ambient declaration so this file type-checks without pulling in
// @types/node (Vercel edge runtime exposes process.env at runtime).
declare const process: { env: Record<string, string | undefined> };

// Vercel Edge Function — server-side proxy to the PlayGuard backend.
//
// Why this exists:
//   The previous setup exposed VITE_HV_API_KEY in the client bundle, which
//   means anyone with browser dev-tools could extract it and call the API
//   directly (resulting in unbounded AWS Rekognition charges). We now hold
//   the key here, server-side, and the SPA hits same-origin /api/proxy/*.
//
// How it works:
//   The SPA calls e.g. POST /api/proxy/playguard/scan. This function:
//     1. Strips the /api/proxy prefix.
//     2. Forwards the request to PG_API_URL with X-API-Key injected.
//     3. Streams the response back.
//
// Required Vercel env vars (NOT prefixed with VITE_/NEXT_PUBLIC_):
//   PG_API_URL    → https://hybrid-vector-api-m5xt.onrender.com
//   PG_API_KEY    → the real PlayGuard API key
//   PG_TENANT_ID  → optional tenant id, injected on every request

export const config = {
  runtime: 'edge',
  // Vercel free plan allows up to 25s on edge. Render cold-starts may take
  // 15-30s — extend if you upgrade to Pro.
  maxDuration: 30,
};

const ALLOWED_PREFIX = '/api/proxy';

// Hop-by-hop / unsafe headers that must never be forwarded.
const STRIP_REQ = new Set([
  'host',
  'connection',
  'content-length',
  'cookie',
  'authorization',
  'x-api-key',
  'x-playguard-key',
  'x-vercel-id',
  'x-vercel-deployment-url',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-proto',
  'x-real-ip',
]);

const STRIP_RES = new Set([
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
]);

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (!url.pathname.startsWith(ALLOWED_PREFIX)) {
    return json({ error: 'Not found' }, 404);
  }

  const apiBase = process.env.PG_API_URL;
  const apiKey = process.env.PG_API_KEY;

  if (!apiBase || !apiKey) {
    return json(
      { error: 'Proxy misconfigured — PG_API_URL or PG_API_KEY missing' },
      500,
    );
  }

  // Build the upstream URL preserving path + query.
  const subPath = url.pathname.slice(ALLOWED_PREFIX.length) || '/';
  const upstreamUrl = `${apiBase.replace(/\/$/, '')}${subPath}${url.search}`;

  // Filter request headers.
  const fwdHeaders = new Headers();
  for (const [name, value] of req.headers) {
    if (!STRIP_REQ.has(name.toLowerCase())) fwdHeaders.set(name, value);
  }
  fwdHeaders.set('X-API-Key', apiKey);
  // Some upstreams use the legacy header name — set both for compatibility.
  fwdHeaders.set('x-playguard-key', apiKey);

  // For JSON requests, optionally inject tenant_id if the body doesn't
  // already carry one. We only do this for application/json bodies on
  // POST/PUT/PATCH so we never disturb multipart streams.
  const tenantId = process.env.PG_TENANT_ID;
  let body: BodyInit | null = null;

  const method = req.method.toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD' && method !== 'DELETE';

  if (hasBody) {
    const contentType = req.headers.get('content-type') || '';
    if (tenantId && contentType.includes('application/json')) {
      try {
        const cloned = await req.clone().json();
        const merged = { tenant_id: tenantId, ...cloned };
        body = JSON.stringify(merged);
        fwdHeaders.set('content-type', 'application/json');
      } catch {
        // Fallback: forward the raw body as-is.
        body = await req.arrayBuffer();
      }
    } else {
      // Pass through (multipart, octet-stream, etc.)
      body = await req.arrayBuffer();
    }
  }

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method,
      headers: fwdHeaders,
      body,
      // Edge runtime does not support keepalive on streamed bodies.
    });
  } catch (e: any) {
    return json({ error: 'Upstream unreachable', detail: e?.message }, 502);
  }

  // Filter response headers.
  const resHeaders = new Headers();
  for (const [name, value] of upstream.headers) {
    if (!STRIP_RES.has(name.toLowerCase())) resHeaders.set(name, value);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: resHeaders,
  });
}

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
