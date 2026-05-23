import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getEvents, type BackendEvent } from '../services/api'

type Verdict = 'ALL' | 'ALLOWED' | 'VERIFY_AGE' | 'MINOR' | 'BANNED'

export function Events() {
  const nav = useNavigate()
  const [events, setEvents] = useState<BackendEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Verdict>('ALL')

  useEffect(() => {
    load()
  }, [filter])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const { events: e } = await getEvents(filter === 'ALL' ? undefined : filter)
      setEvents(e)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  const badgeClass: Record<string, string> = {
    ALLOWED: 'badge-green',
    VERIFY_AGE: 'badge-amber',
    MINOR: 'badge-amber',
    BANNED: 'badge-red',
  }

  return (
    <div className="page" style={{ maxWidth: 600 }}>
      <div className="logo">🎮 PLAYGUARD</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 20 }}>
        <h1 className="step-title" style={{ textAlign: 'left', margin: 0 }}>Event Log</h1>
        <span style={{ fontSize: 12, color: 'var(--grey)' }}>{events.length} events</span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, width: '100%', flexWrap: 'wrap' }}>
        {(['ALL', 'ALLOWED', 'VERIFY_AGE', 'MINOR', 'BANNED'] as Verdict[]).map(v => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            style={{
              padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
              fontWeight: 600, fontSize: 12, letterSpacing: '0.05em',
              background: filter === v
                ? v === 'ALLOWED' ? 'var(--green)'
                  : v === 'VERIFY_AGE' || v === 'MINOR' ? 'var(--amber)'
                  : v === 'BANNED' ? 'var(--red)'
                  : 'var(--blue)'
                : 'var(--bg3)',
              color: filter === v
                ? (v === 'VERIFY_AGE' || v === 'MINOR' ? '#0a0f1e' : '#fff')
                : 'var(--grey)',
              border: `1px solid ${filter === v ? 'transparent' : 'var(--border)'}`,
            }}
          >
            {v}
          </button>
        ))}
      </div>

      {loading && <p style={{ color: 'var(--grey)', textAlign: 'center' }}>Loading…</p>}
      {error && <p style={{ color: 'var(--red)', textAlign: 'center' }}>{error}</p>}

      {!loading && !error && events.length === 0 && (
        <p style={{ color: 'var(--grey)', textAlign: 'center' }}>No events found.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
        {events.map(ev => (
          <div key={ev.scanId} className="card" style={{ padding: '14px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span className={`badge ${badgeClass[ev.verdict] ?? 'badge-blue'}`} style={{ marginBottom: 0 }}>
                {ev.verdict}
              </span>
              <span style={{ fontSize: 11, color: 'var(--grey)' }}>
                {new Date(ev.timestamp).toLocaleString()}
              </span>
            </div>
            <div className="metric-row" style={{ paddingTop: 6 }}>
              <span className="metric-label">Age range</span>
              <span style={{ fontSize: 13, color: 'var(--white)' }}>
                {ev.age.range.Low}–{ev.age.range.High}
              </span>
            </div>
            {ev.playerId && (
              <div className="metric-row">
                <span className="metric-label">Player ID</span>
                <span style={{ fontSize: 13, color: 'var(--white)' }}>{ev.playerId}</span>
              </div>
            )}
            {ev.ban?.detected && (
              <div className="metric-row">
                <span className="metric-label">Ban similarity</span>
                <span style={{ fontSize: 13, color: 'var(--red)' }}>
                  {ev.ban.similarity?.toFixed(1)}%
                </span>
              </div>
            )}
            <div className="metric-row" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <span className="metric-label">Confidence</span>
              <span style={{ fontSize: 13, color: 'var(--grey)' }}>
                {ev.faceConfidence.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      <button className="btn btn-outline" style={{ marginTop: 24 }} onClick={() => nav('/')}>
        ← Back
      </button>
    </div>
  )
}
