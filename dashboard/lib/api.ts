const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3007'
const API_KEY = process.env.NEXT_PUBLIC_PG_API_KEY || ''

const headers = () => ({
  'Content-Type': 'application/json',
  'x-playguard-key': API_KEY,
})

export async function scanPlayer(image: string, playerId?: string, boardId?: string, platform?: string) {
  const res = await fetch(`${API_URL}/playguard/scan`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ image, playerId, boardId, platform }),
  })
  if (!res.ok) throw new Error(`Scan failed: ${res.status}`)
  return res.json() as Promise<{ success: boolean; result: any }>
}

export async function addBan(image: string, externalId: string, reason: string, operator: string) {
  const res = await fetch(`${API_URL}/playguard/ban`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ image, externalId, reason, operator }),
  })
  if (!res.ok) throw new Error(`Add ban failed: ${res.status}`)
  return res.json() as Promise<{ success: boolean; faceId: string; externalId: string; bannedAt: string }>
}

export async function unbanPlayer(faceId: string) {
  const res = await fetch(`${API_URL}/playguard/ban/${faceId}`, {
    method: 'DELETE',
    headers: headers(),
  })
  if (!res.ok) throw new Error(`Unban failed: ${res.status}`)
  return res.json() as Promise<{ success: boolean; faceId: string }>
}

export async function getStatus() {
  const res = await fetch(`${API_URL}/playguard/status`, { headers: headers() })
  if (!res.ok) throw new Error(`Status failed: ${res.status}`)
  return res.json() as Promise<{
    success: boolean
    collection: string
    collectionSize: number
    queueSize: number
    awsRegion: string
    mode: 'UPLOAD' | 'COLLECT'
    ageThreshold: number
    matchThreshold: number
  }>
}

export async function getEvents(verdict?: string, limit = 50) {
  const url = new URL(`${API_URL}/playguard/events`)
  if (verdict) url.searchParams.set('verdict', verdict)
  url.searchParams.set('limit', limit.toString())
  const res = await fetch(url.toString(), { headers: headers() })
  if (!res.ok) throw new Error(`Events failed: ${res.status}`)
  return res.json() as Promise<{ success: boolean; events: any[]; source: string }>
}

export async function syncQueue() {
  const res = await fetch(`${API_URL}/playguard/sync`, {
    method: 'POST',
    headers: headers(),
  })
  if (!res.ok) throw new Error(`Sync failed: ${res.status}`)
  return res.json() as Promise<{ success: boolean; flushed: number; failed: number }>
}
