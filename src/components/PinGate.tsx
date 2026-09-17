import { useState } from 'react'
import { requestSession } from '../services/session'

interface Props {
  onSuccess: () => void
}

export function PinGate({ onSuccess }: Props) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pin.trim() || loading) return
    setLoading(true)
    setError(null)
    try {
      await requestSession(pin.trim())
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="logo">🎮 PLAYGUARD</div>
      <h1 className="step-title">Operator Access</h1>
      <p className="step-sub">Enter the operator PIN to continue.</p>

      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 340 }}>
        <div className="field">
          <label>Operator PIN</label>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            value={pin}
            onChange={e => setPin(e.target.value)}
            disabled={loading}
          />
        </div>

        {error && (
          <div style={{ color: 'var(--red)', marginBottom: 16, fontSize: 14, textAlign: 'center' }}>
            {error}
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={loading || !pin.trim()}>
          {loading ? 'Verifying…' : 'Unlock'}
        </button>
      </form>
    </div>
  )
}
