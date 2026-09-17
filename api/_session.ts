// Shared helpers for the edge functions (files prefixed with _ are not routed
// by Vercel). Web Crypto only — the edge runtime has no node:crypto.

const encoder = new TextEncoder();

export function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export async function sha256Hex(data: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return toHex(digest);
}

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function hmacKey(secret: string, usage: 'sign' | 'verify'): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    [usage],
  );
}

/** Token format: `pg1.<expiryMs>.<hmacSha256Hex>` signed over `pg1.<expiryMs>`. */
export async function issueToken(secret: string, ttlMs: number): Promise<{ token: string; expires_at: number }> {
  const expires = Date.now() + ttlMs;
  const payload = `pg1.${expires}`;
  const key = await hmacKey(secret, 'sign');
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return { token: `${payload}.${toHex(sig)}`, expires_at: expires };
}

export async function verifyToken(token: string | null, secret: string): Promise<boolean> {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'pg1') return false;
  const expires = Number(parts[1]);
  if (!Number.isFinite(expires) || expires <= Date.now()) return false;
  if (!/^[0-9a-f]{64}$/.test(parts[2])) return false;
  const key = await hmacKey(secret, 'verify');
  // crypto.subtle.verify is constant-time by construction
  return crypto.subtle.verify('HMAC', key, fromHex(parts[2]) as BufferSource, encoder.encode(`${parts[0]}.${parts[1]}`));
}
