// Operator session — the SPA holds a signed token issued by POST /api/auth
// (PIN verified server-side). Stored in sessionStorage: cleared when the tab
// closes, which matches the shared-kiosk usage model.

const KEY = 'pg_session';

export function getToken(): string | null {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const { token, expires_at } = JSON.parse(raw) as { token: string; expires_at: number };
    if (typeof token !== 'string' || typeof expires_at !== 'number' || expires_at <= Date.now()) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return token;
  } catch {
    sessionStorage.removeItem(KEY);
    return null;
  }
}

export function setSession(token: string, expires_at: number): void {
  sessionStorage.setItem(KEY, JSON.stringify({ token, expires_at }));
}

export function clearSession(): void {
  sessionStorage.removeItem(KEY);
}

export async function requestSession(pin: string): Promise<void> {
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 401) throw new Error('Invalid PIN');
  if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
  const data = (await res.json()) as { token: string; expires_at: number };
  setSession(data.token, data.expires_at);
}
