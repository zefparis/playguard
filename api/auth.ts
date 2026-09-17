// Vercel Edge Function — operator PIN → signed session token.
//
// The SPA has no user accounts: it's a shared operator kiosk. Operators enter
// a PIN (env PG_OPERATOR_PIN); this function returns an HMAC-signed token that
// /api/proxy requires on every call (env PG_PROXY_SECRET signs it).
//
// Required Vercel env vars (server-side only):
//   PG_OPERATOR_PIN   → the operator PIN
//   PG_PROXY_SECRET   → random secret used to sign session tokens

declare const process: { env: Record<string, string | undefined> };

import { json, sha256Hex, issueToken } from './_session';

export const config = { runtime: 'edge' };

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h — one operator shift

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const secret = process.env.PG_PROXY_SECRET;
  const expectedPin = process.env.PG_OPERATOR_PIN;
  if (!secret || !expectedPin) {
    return json({ error: 'Auth not configured — PG_OPERATOR_PIN or PG_PROXY_SECRET missing' }, 500);
  }

  let pin: unknown;
  try {
    pin = (await req.json()).pin;
  } catch {
    return json({ error: 'Bad request' }, 400);
  }

  // Compare SHA-256 of both sides — fixed-length comparison avoids leaking
  // the PIN length through timing, without needing a stored hash.
  const ok =
    typeof pin === 'string' &&
    pin.length <= 64 &&
    (await sha256Hex(pin)) === (await sha256Hex(expectedPin));

  if (!ok) {
    // Fixed delay on failure — cheap brute-force dampening for a stateless
    // edge function (real rate limiting would need Upstash/CF).
    await new Promise((r) => setTimeout(r, 600));
    return json({ error: 'Invalid PIN' }, 401);
  }

  const { token, expires_at } = await issueToken(secret, SESSION_TTL_MS);
  return json({ token, expires_at }, 200);
}
