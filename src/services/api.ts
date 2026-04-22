const API = import.meta.env.VITE_API_URL || 'https://hybrid-vector-api.fly.dev'
const TENANT = import.meta.env.VITE_TENANT_ID
const API_KEY = import.meta.env.VITE_HV_API_KEY

const headers = () => {
  if (!API_KEY) throw new Error('Missing VITE_HV_API_KEY')
  if (!TENANT) throw new Error('Missing VITE_TENANT_ID')
  return {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  }
}

export interface ScanResult {
  scanId: string
  verdict: 'ALLOWED' | 'MINOR' | 'BANNED'
  access: boolean
  age: { range: { Low: number; High: number }; isMinor: boolean; estimatedAge: number }
  ban: { detected: boolean; faceId: string | null; externalId: string | null; similarity: number | null }
  faceConfidence: number
  timestamp: string
  playerId: string | null
  boardId: string | null
  platform: string | null
}

export async function scanPlayer(payload: {
  selfie_b64: string
  player_id?: string
  board_id?: string
  platform?: string
}): Promise<{ success: boolean; result: ScanResult }> {
  const res = await fetch(`${API}/playguard/scan`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ ...payload, tenant_id: TENANT }),
  })
  if (!res.ok) throw new Error(`Scan failed: ${res.status}`)
  return res.json()
}

export async function banPlayer(payload: {
  selfie_b64: string
  external_id: string
  reason: string
  operator: string
}): Promise<{ success: boolean; faceId: string; externalId: string; bannedAt: string }> {
  const res = await fetch(`${API}/playguard/ban`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ ...payload, tenant_id: TENANT }),
  })
  if (!res.ok) throw new Error(`Ban failed: ${res.status}`)
  return res.json()
}

export async function unbanPlayer(faceId: string): Promise<{ success: boolean; faceId: string }> {
  const res = await fetch(`${API}/playguard/ban/${faceId}`, {
    method: 'DELETE',
    headers: headers(),
  })
  if (!res.ok) throw new Error(`Unban failed: ${res.status}`)
  return res.json()
}

export async function getStatus(): Promise<{
  success: boolean
  collection: string
  collectionSize: number
  ageThreshold: number
  matchThreshold: number
  awsRegion: string
}> {
  const res = await fetch(`${API}/playguard/status`, { headers: headers() })
  if (!res.ok) throw new Error(`Status failed: ${res.status}`)
  return res.json()
}

export async function getEvents(verdict?: string, limit = 50): Promise<{ success: boolean; events: any[]; source: string }> {
  const url = new URL(`${API}/playguard/events`)
  if (verdict) url.searchParams.set('verdict', verdict)
  url.searchParams.set('limit', limit.toString())
  const res = await fetch(url.toString(), { headers: headers() })
  if (!res.ok) throw new Error(`Events failed: ${res.status}`)
  return res.json()
}

export async function getBans(limit = 100): Promise<{ success: boolean; bans: any[] }> {
  const url = new URL(`${API}/playguard/bans`)
  url.searchParams.set('limit', limit.toString())
  const res = await fetch(url.toString(), { headers: headers() })
  if (!res.ok) throw new Error(`Bans failed: ${res.status}`)
  return res.json()
}
