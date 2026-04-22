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

  const verdictIcon = { ALLOWED: '✅', MINOR: '⚠️', BANNED: '🚫' }
  const verdictMsg = {
    ALLOWED: 'Player may enter.',
    MINOR: 'Access denied — underage player.',
    BANNED: 'Access denied — player is self-excluded.',
  }

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
            <div className="verdict-icon">{verdictIcon[result.verdict]}</div>
            <div className={`verdict-label ${result.verdict}`}>{result.verdict}</div>
            <p style={{ marginTop: 10, fontSize: 14, color: 'var(--grey)' }}>
              {verdictMsg[result.verdict]}
            </p>
          </div>

          <div className="card" style={{ width: '100%', marginBottom: 16 }}>
            <div className="metric-row">
              <span className="metric-label">Estimated Age</span>
              <span className={`metric-value ${result.age.isMinor ? 'amber' : 'green'}`}>
                ~{result.age.estimatedAge} yrs ({result.age.range.Low}–{result.age.range.High})
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
