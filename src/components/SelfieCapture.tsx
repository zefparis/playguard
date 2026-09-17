import { useState } from 'react'
import { useCamera } from '../hooks/useCamera'
import { CameraInitLoader } from './CameraInitLoader'

interface Props {
  onCapture: (b64: string) => void
  loading?: boolean
  actionLabel?: string
}

export function SelfieCapture({ onCapture, loading, actionLabel = 'Scan' }: Props) {
  const { videoRef, ready, error, capture, isInitializing } = useCamera()
  const [captured, setCaptured] = useState<string | null>(null)

  // Capture only freezes the preview — the frame is submitted to the parent
  // via onCapture() when the operator presses Confirm. Previously Confirm
  // re-captured a *new* live frame and Scan submitted on first click, which
  // meant the previewed photo was never the one sent, and a second
  // (billable) scan fired on confirm.
  function handleCapture() {
    const b64 = capture()
    if (b64) setCaptured(b64)
  }

  function handleConfirm() {
    if (captured) onCapture(captured)
  }

  if (error) return (
    <div style={{ color: 'var(--red)', textAlign: 'center', padding: '20px' }}>{error}</div>
  )

  return (
    <div style={{ width: '100%' }}>
      <CameraInitLoader isLoading={isInitializing} />
      <div style={{
        position: 'relative', width: '100%', maxWidth: 340, margin: '0 auto 20px',
        borderRadius: 12, overflow: 'hidden',
        border: `2px solid ${captured ? 'var(--blue)' : 'var(--border)'}`,
        aspectRatio: '4/3', background: 'var(--bg3)'
      }}>
        <video
          ref={videoRef}
          autoPlay playsInline muted
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: captured ? 'none' : 'block' }}
        />
        {captured && (
          <img src={captured} alt="captured" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        {!ready && !captured && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--grey)' }}>
            Starting camera...
          </div>
        )}
        <div style={{
          position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.6)', borderRadius: 20, padding: '3px 10px',
          fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
          color: captured ? 'var(--blue)' : 'var(--grey)'
        }}>
          {captured ? '✓ CAPTURED' : 'LIVE'}
        </div>
      </div>

      {!captured ? (
        <button className="btn btn-primary" onClick={handleCapture} disabled={!ready || loading}>
          {loading ? 'Processing...' : actionLabel}
        </button>
      ) : (
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={() => setCaptured(null)} disabled={loading}>
            Retake
          </button>
          <button className="btn btn-primary" onClick={handleConfirm} disabled={loading}>
            {loading ? 'Processing...' : 'Confirm'}
          </button>
        </div>
      )}
    </div>
  )
}
