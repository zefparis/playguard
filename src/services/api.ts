// All requests go through the same-origin Vercel Edge proxy at /api/proxy.
// The real upstream URL and the API key live server-side, never in the
// client bundle. Every call carries the operator session token (X-PG-Token)
// issued by POST /api/auth — see api/proxy.ts and src/services/session.ts.
import { getToken, clearSession } from './session'

const API = '/api/proxy'

export class AuthError extends Error {}

// Central fetch wrapper: injects the session token and turns upstream 401s
// into an app-wide 'pg:unauthorized' event so App can re-show the PIN gate.
async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken()
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'X-PG-Token': token } : {}),
      ...(init.headers ?? {}),
    },
  })
  if (res.status === 401) {
    clearSession()
    window.dispatchEvent(new Event('pg:unauthorized'))
    throw new AuthError('Session expired — please re-enter the operator PIN')
  }
  return res
}

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
  const res = await apiFetch('/playguard/scan', {
    method: 'POST',
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
  const res = await apiFetch('/playguard/ban', {
    method: 'POST',
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(45_000),
  })
  if (!res.ok) throw new Error(`Ban failed: ${res.status}`)
  return res.json()
}

export async function unbanPlayer(faceId: string): Promise<{ success: boolean; faceId: string }> {
  const res = await apiFetch(`/playguard/ban/${faceId}`, {
    method: 'DELETE',
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
  const res = await apiFetch('/playguard/status', {
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`Status failed: ${res.status}`)
  return res.json()
}

// Event shape consumed by the UI. The production backend returns raw
// playguard_events rows in snake_case — mapEvent() normalizes them here so
// components never touch DB column names.
export interface BackendEvent {
  scanId: string
  verdict: 'ALLOWED' | 'MINOR' | 'BANNED' | 'VERIFY_AGE' | 'BAN_CHECK_FAILED'
  access: boolean
  age: {
    range: { Low: number; High: number }
    isMinor: boolean
  }
  ban: {
    detected: boolean
    similarity?: number
    faceId?: string
  }
  faceConfidence: number
  timestamp: string
  playerId?: string
  boardId?: string
  platform?: string
}

interface EventRow {
  id: string
  verdict: BackendEvent['verdict']
  age_low: number | null
  age_high: number | null
  is_minor: boolean | null
  ban_detected: boolean | null
  ban_face_id: string | null
  ban_similarity: number | null
  face_confidence: number | null
  scanned_at: string
  player_id: string | null
  board_id: string | null
  platform: string | null
}

function mapEvent(r: EventRow): BackendEvent {
  return {
    scanId: r.id,
    verdict: r.verdict,
    access: r.verdict === 'ALLOWED',
    age: {
      range: { Low: r.age_low ?? 0, High: r.age_high ?? 0 },
      isMinor: r.is_minor ?? false,
    },
    ban: {
      detected: r.ban_detected ?? false,
      similarity: r.ban_similarity ?? undefined,
      faceId: r.ban_face_id ?? undefined,
    },
    faceConfidence: r.face_confidence ?? 0,
    timestamp: r.scanned_at,
    playerId: r.player_id ?? undefined,
    boardId: r.board_id ?? undefined,
    platform: r.platform ?? undefined,
  }
}

export async function getEvents(
  verdict?: string,
  limit = 50,
): Promise<{ success: boolean; events: BackendEvent[]; source?: string }> {
  const params = new URLSearchParams()
  if (verdict) params.set('verdict', verdict)
  params.set('limit', limit.toString())
  const res = await apiFetch(`/playguard/events?${params.toString()}`, {
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`Events failed: ${res.status}`)
  const data = (await res.json()) as { success: boolean; events: EventRow[]; source?: string }
  return { ...data, events: (data.events ?? []).map(mapEvent) }
}

// Ban list entry for the UI. Rows come back as playguard_bans snake_case —
// mapBan() normalizes them (face_id → faceId, banned_at → bannedAt, ...).
export interface BackendBan {
  faceId: string
  externalId: string
  reason: string
  operator: string
  bannedAt: string
}

interface BanRow {
  face_id: string
  external_id: string
  reason: string
  operator: string
  banned_at: string
}

function mapBan(r: BanRow): BackendBan {
  return {
    faceId: r.face_id,
    externalId: r.external_id,
    reason: r.reason,
    operator: r.operator,
    bannedAt: r.banned_at,
  }
}

export async function getBans(
  limit = 100,
): Promise<{ success: boolean; bans: BackendBan[] }> {
  const res = await apiFetch(`/playguard/bans?limit=${limit}`, {
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`Bans failed: ${res.status}`)
  const data = (await res.json()) as { success: boolean; bans: BanRow[] }
  return { ...data, bans: (data.bans ?? []).map(mapBan) }
}
