// All requests go through the same-origin Vercel Edge proxy at /api/proxy.
// The real upstream URL and the API key live server-side, never in the
// client bundle. See api/proxy.ts.
const API = '/api/proxy'

const headers = () => ({
  'Content-Type': 'application/json',
})

// Re-export the shared ScanResult shape so screens import a single source of
// truth (includes VERIFY_AGE, isAmbiguous, quality, ambiguityNote).
export type { ScanResult, PlayGuardVerdict, BanRecord } from '../types'
import type { ScanResult } from '../types'

export async function scanPlayer(payload: {
  selfie_b64: string
  player_id?: string
  board_id?: string
  platform?: string
}): Promise<{ success: boolean; result: ScanResult }> {
  const res = await fetch(`${API}/playguard/scan`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(45_000),
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
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(45_000),
  })
  if (!res.ok) throw new Error(`Ban failed: ${res.status}`)
  return res.json()
}

export async function unbanPlayer(faceId: string): Promise<{ success: boolean; faceId: string }> {
  const res = await fetch(`${API}/playguard/ban/${faceId}`, {
    method: 'DELETE',
    headers: headers(),
    signal: AbortSignal.timeout(30_000),
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
  mode?: 'UPLOAD' | 'COLLECT'
  queueSize?: number
}> {
  const res = await fetch(`${API}/playguard/status`, {
    headers: headers(),
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`Status failed: ${res.status}`)
  return res.json()
}

// Backend event shape (camelCase as written by Fastify in backend/server.js).
export interface BackendEvent {
  scanId: string
  verdict: 'ALLOWED' | 'MINOR' | 'BANNED' | 'VERIFY_AGE'
  access: boolean
  age: {
    range: { Low: number; High: number }
    isMinor: boolean
    isAmbiguous?: boolean
    threshold: number
    ambiguityNote?: string | null
  }
  ban: {
    detected: boolean
    similarity?: number
    faceId?: string
    externalId?: string
  }
  quality?: { Brightness: number; Sharpness: number }
  faceConfidence: number
  timestamp: string
  playerId?: string
  boardId?: string
  platform?: string
}

export async function getEvents(
  verdict?: string,
  limit = 50,
): Promise<{ success: boolean; events: BackendEvent[]; source?: string }> {
  const params = new URLSearchParams()
  if (verdict) params.set('verdict', verdict)
  params.set('limit', limit.toString())
  const res = await fetch(`${API}/playguard/events?${params.toString()}`, {
    headers: headers(),
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`Events failed: ${res.status}`)
  return res.json()
}

// Ban list entry as returned by the backend (camelCase, matching IndexFaces
// + the BAN# DynamoDB record written by /playguard/ban).
export interface BackendBan {
  faceId: string
  externalId: string
  reason: string
  operator: string
  bannedAt: string
}

export async function getBans(
  limit = 100,
): Promise<{ success: boolean; bans: BackendBan[] }> {
  const res = await fetch(`${API}/playguard/bans?limit=${limit}`, {
    headers: headers(),
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`Bans failed: ${res.status}`)
  return res.json()
}
