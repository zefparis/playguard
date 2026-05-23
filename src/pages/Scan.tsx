import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SelfieCapture } from '../components/SelfieCapture'
import { scanPlayer, type ScanResult } from '../services/api'

export function Scan() {
  const nav = useNavigate()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleCapture(b64: string) {
    setLoading(true)
    setError(null)
    try {
      const { result: r } = await scanPlayer({ selfie_b64: b64 })
      setResult(r)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scan failed')
    } finally {
      setLoading(false)
    }
  }

  const verdictIcon: Record<string, string> = {
    ALLOWED: '✅',
    VERIFY_AGE: '⚠️',
    MINOR: '🚫',
    BANNED: '⛔',
  }
  const verdictMsg: Record<string, string> = {
    ALLOWED: 'Player may enter.',
    VERIFY_AGE: 'Age uncertain — request physical ID before granting access.',
    MINOR: 'Access denied — underage player.',
    BANNED: 'Access denied — player is self-excluded.',
  }

  // Backend reports age as { Low, High } range. Use the midpoint as the
  // displayed estimate (estimatedAge field was never sent by the backend).
  const estimatedAge = result
    ? Math.round((result.age.range.Low + result.age.range.High) / 2)
    : 0

  return (
    <div className="page">
      <div className="logo">🎮 PLAYGUARD</div>

      {!result ? (
        <>
          <h1 className="step-title">Scan Player</h1>
          <p className="step-sub">
            Position the player's face in the frame.<br />
            Tap <strong>Scan</strong> for instant verification.
          </p>
          <SelfieCapture onCapture={handleCapture} loading={loading} actionLabel="Scan →" />
          {error && (
            <div style={{ color: 'var(--red)', marginTop: 16, textAlign: 'center', fontSize: 14 }}>
              {error}
            </div>
          )}
          <button className="btn btn-outline" style={{ marginTop: 20 }} onClick={() => nav('/')}>
            ← Back
          </button>
        </>
      ) : (
        <>
          <div className={`verdict-block ${result.verdict}`}>
            <div className="verdict-icon">{verdictIcon[result.verdict] ?? 'ℹ️'}</div>
            <div className={`verdict-label ${result.verdict}`}>{result.verdict}</div>
            <p style={{ marginTop: 10, fontSize: 14, color: 'var(--grey)' }}>
              {verdictMsg[result.verdict] ?? 'Verification complete.'}
            </p>
            {result.age.isAmbiguous && result.age.ambiguityNote && (
              <p style={{ marginTop: 8, fontSize: 12, color: 'var(--amber)' }}>
                {result.age.ambiguityNote}
              </p>
            )}
          </div>

          <div className="card" style={{ width: '100%', marginBottom: 16 }}>
            <div className="metric-row">
              <span className="metric-label">Estimated Age</span>
              <span className={`metric-value ${result.age.isMinor ? 'amber' : 'green'}`}>
                ~{estimatedAge} yrs ({result.age.range.Low}–{result.age.range.High})
              </span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Minor Flag</span>
              <span className={`metric-value ${result.age.isMinor ? 'red' : 'green'}`}>
                {result.age.isMinor ? 'YES' : 'NO'}
              </span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Ban Match</span>
              <span className={`metric-value ${result.ban.detected ? 'red' : 'green'}`}>
                {result.ban.detected ? `YES (${result.ban.similarity?.toFixed(1)}%)` : 'NO'}
              </span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Face Confidence</span>
              <span className="metric-value">{result.faceConfidence.toFixed(1)}%</span>
            </div>
            {result.quality && (
              <div className="metric-row">
                <span className="metric-label">Image Quality</span>
                <span className="metric-value">
                  B {result.quality.Brightness.toFixed(0)} · S {result.quality.Sharpness.toFixed(0)}
                </span>
              </div>
            )}
            <div className="metric-row">
              <span className="metric-label">Scan ID</span>
              <span style={{ fontSize: 10, color: 'var(--grey)', fontFamily: 'monospace' }}>
                {result.scanId.slice(0, 18)}…
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            <button className="btn btn-outline" onClick={() => setResult(null)}>
              New Scan
            </button>
            <button className="btn btn-primary" onClick={() => nav('/')}>
              Home
            </button>
          </div>
        </>
      )}
    </div>
  )
}
