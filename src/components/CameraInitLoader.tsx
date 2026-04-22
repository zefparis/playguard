import { useEffect, useState } from 'react'

interface Props {
  isLoading: boolean
}

export function CameraInitLoader({ isLoading }: Props) {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('Initializing camera...')
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    if (!isLoading) { setProgress(0); setFadeOut(false); return }

    setProgress(0); setFadeOut(false)
    const startTime = Date.now()
    const duration = 2000

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const p = Math.min((elapsed / duration) * 100, 100)
      setProgress(p)
      if (p < 33) setStatus('Initializing camera...')
      else if (p < 66) setStatus('Connecting to verification service...')
      else setStatus('Ready')

      if (p >= 100) {
        clearInterval(interval)
        setFadeOut(true)
      }
    }, 16)

    return () => clearInterval(interval)
  }, [isLoading])

  if (!isLoading && !fadeOut) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(10,15,30,0.95)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, opacity: fadeOut ? 0 : 1, transition: 'opacity 0.5s ease-out',
      pointerEvents: fadeOut ? 'none' : 'auto',
    }}>
      <div style={{ width: '100%', maxWidth: 300, padding: '0 20px' }}>
        <div style={{ width: '100%', height: 4, background: 'var(--border)', borderRadius: 2, marginBottom: 24, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'var(--blue)', borderRadius: 2, width: `${progress}%`, transition: 'width 0.1s linear' }} />
        </div>
        <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--grey)', fontWeight: 500 }}>{status}</div>
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--blue)', marginTop: 12, fontWeight: 600, opacity: 0.7 }}>
          {Math.round(progress)}%
        </div>
      </div>
    </div>
  )
}
