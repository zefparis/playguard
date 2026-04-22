import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SelfieCapture } from '../components/SelfieCapture'
import { banPlayer } from '../services/api'

export function AddBan() {
  const nav = useNavigate()
  const [capturedB64, setCapturedB64] = useState<string | null>(null)
  const [externalId, setExternalId] = useState('')
  const [reason, setReason] = useState('')
  const [operator, setOperator] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<{ faceId: string; externalId: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!capturedB64) { setError('Please capture a photo first.'); return }
    if (!externalId.trim() || !reason.trim() || !operator.trim()) {
      setError('All fields are required.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await banPlayer({
        selfie_b64: capturedB64,
        external_id: externalId.trim(),
        reason: reason.trim(),
        operator: operator.trim(),
      })
      setSuccess({ faceId: res.faceId, externalId: res.externalId })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add ban')
    } finally {
      setLoading(false)
    }
  }

  if (success) return (
    <div className="page">
      <div className="logo">🎮 PLAYGUARD</div>
      <div className="verdict-block ALLOWED">
        <div className="verdict-icon">✅</div>
        <div className="verdict-label ALLOWED">BANNED</div>
        <p style={{ marginTop: 10, fontSize: 14, color: 'var(--grey)' }}>
          Player <strong style={{ color: 'var(--white)' }}>{success.externalId}</strong> added to registry.
        </p>
      </div>
      <div className="card" style={{ width: '100%', marginBottom: 20 }}>
        <div className="metric-row">
          <span className="metric-label">Face ID</span>
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--grey)' }}>
            {success.faceId.slice(0, 24)}…
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, width: '100%' }}>
        <button className="btn btn-outline" onClick={() => { setSuccess(null); setCapturedB64(null); setExternalId(''); setReason(''); setOperator('') }}>
          Add Another
        </button>
        <button className="btn btn-primary" onClick={() => nav('/banned')}>View Registry</button>
      </div>
    </div>
  )

  return (
    <div className="page">
      <div className="logo">🎮 PLAYGUARD</div>
      <h1 className="step-title">Add to Registry</h1>
      <p className="step-sub">
        Capture the player's face, then fill in the details.
      </p>

      <div style={{ width: '100%', marginBottom: 24 }}>
        <SelfieCapture
          onCapture={b64 => { setCapturedB64(b64); setError(null) }}
          loading={loading}
          actionLabel="Capture Photo"
        />
      </div>

      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
        <div className="field">
          <label>Player ID / National ID</label>
          <input
            type="text"
            value={externalId}
            onChange={e => setExternalId(e.target.value)}
            placeholder="e.g. RSA-8901015-1234-567"
            disabled={loading}
          />
        </div>

        <div className="field">
          <label>Reason for Exclusion</label>
          <select value={reason} onChange={e => setReason(e.target.value)} disabled={loading}>
            <option value="">— Select reason —</option>
            <option value="Self-exclusion (voluntary)">Self-exclusion (voluntary)</option>
            <option value="Board-mandated exclusion">Board-mandated exclusion</option>
            <option value="Problem gambling intervention">Problem gambling intervention</option>
            <option value="Underage identification">Underage identification</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="field">
          <label>Operator / Staff ID</label>
          <input
            type="text"
            value={operator}
            onChange={e => setOperator(e.target.value)}
            placeholder="e.g. STAFF-001"
            disabled={loading}
          />
        </div>

        {error && (
          <div style={{ color: 'var(--red)', marginBottom: 16, fontSize: 14, textAlign: 'center' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn btn-outline" onClick={() => nav('/')} disabled={loading}>
            ← Back
          </button>
          <button type="submit" className="btn btn-danger" disabled={loading || !capturedB64}>
            {loading ? 'Adding…' : '🚫 Add to Registry'}
          </button>
        </div>
      </form>
    </div>
  )
}
