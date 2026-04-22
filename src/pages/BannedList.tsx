import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getBans, unbanPlayer } from '../services/api'

interface BanRecord {
  face_id: string
  external_id: string
  reason: string
  operator: string
  banned_at: string
}

export function BannedList() {
  const nav = useNavigate()
  const [bans, setBans] = useState<BanRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unbanning, setUnbanning] = useState<string | null>(null)

  useEffect(() => {
    loadBans()
  }, [])

  async function loadBans() {
    setLoading(true)
    setError(null)
    try {
      const { bans: b } = await getBans()
      setBans(b)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  async function handleUnban(faceId: string) {
    if (!confirm('Remove this player from the banned registry?')) return
    setUnbanning(faceId)
    try {
      await unbanPlayer(faceId)
      setBans(prev => prev.filter(b => b.face_id !== faceId))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Unban failed')
    } finally {
      setUnbanning(null)
    }
  }

  return (
    <div className="page" style={{ maxWidth: 600 }}>
      <div className="logo">🎮 PLAYGUARD</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 24 }}>
        <div>
          <h1 className="step-title" style={{ textAlign: 'left', marginBottom: 4 }}>Banned Registry</h1>
          <p style={{ fontSize: 13, color: 'var(--grey)' }}>{bans.length} player{bans.length !== 1 ? 's' : ''} on record</p>
        </div>
        <button className="btn btn-primary" style={{ width: 'auto', padding: '10px 18px' }} onClick={() => nav('/add-ban')}>
          + Add
        </button>
      </div>

      {loading && <p style={{ color: 'var(--grey)', textAlign: 'center' }}>Loading…</p>}
      {error && <p style={{ color: 'var(--red)', textAlign: 'center' }}>{error}</p>}

      {!loading && !error && bans.length === 0 && (
        <div className="card" style={{ textAlign: 'center', width: '100%' }}>
          <p style={{ color: 'var(--grey)', marginBottom: 16 }}>No banned players on record.</p>
          <button className="btn btn-primary" onClick={() => nav('/add-ban')}>Add First Player</button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
        {bans.map(b => (
          <div key={b.face_id} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{b.external_id}</div>
                <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 2 }}>
                  Reason: {b.reason}
                </div>
                <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 2 }}>
                  Operator: {b.operator}
                </div>
                <div style={{ fontSize: 11, color: 'var(--border)', fontFamily: 'monospace', marginTop: 6 }}>
                  {b.face_id.slice(0, 20)}…
                </div>
                <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 4 }}>
                  {new Date(b.banned_at).toLocaleDateString()}
                </div>
              </div>
              <button
                className="btn btn-danger"
                style={{ width: 'auto', padding: '8px 14px', fontSize: 13, marginLeft: 12 }}
                disabled={unbanning === b.face_id}
                onClick={() => handleUnban(b.face_id)}
              >
                {unbanning === b.face_id ? '…' : 'Unban'}
              </button>
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
