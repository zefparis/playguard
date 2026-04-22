import { useEffect, useMemo, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type Props = { appName: string; badgeClassName: string }

type NavigatorWithStandalone = Navigator & { standalone?: boolean }
type MediaQueryListWithLegacy = MediaQueryList & {
  addListener?: (l: (e: MediaQueryListEvent) => void) => void
  removeListener?: (l: (e: MediaQueryListEvent) => void) => void
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((window.navigator as NavigatorWithStandalone).standalone)
}

export function InstallAppCard({ appName, badgeClassName }: Props) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)

  const ua = useMemo(() => navigator.userAgent.toLowerCase(), [])
  const isIos = useMemo(() => /iphone|ipad|ipod/.test(ua), [ua])
  const isSafari = useMemo(() => isIos && /safari/.test(ua) && !/crios|fxios|edgios/.test(ua), [isIos, ua])

  useEffect(() => {
    setInstalled(isStandalone())

    const mq = window.matchMedia('(display-mode: standalone)') as MediaQueryListWithLegacy
    const onChange = () => setInstalled(isStandalone())
    const onBeforeInstall = (e: Event) => { e.preventDefault(); setDeferredPrompt(e as BeforeInstallPromptEvent) }
    const onInstalled = () => { setInstalled(true); setDeferredPrompt(null) }

    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange)
    else mq.addListener?.(onChange)
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      if (typeof mq.removeEventListener === 'function') mq.removeEventListener('change', onChange)
      else mq.removeListener?.(onChange)
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted') setInstalled(true)
    setDeferredPrompt(null)
  }

  return (
    <div className="card" style={{ width: '100%', marginTop: 18 }}>
      <div className={badgeClassName}>{installed ? 'Installed' : 'Install on phone'}</div>
      <h2 style={{ fontSize: 18, marginTop: 10, marginBottom: 6 }}>{appName} mobile app</h2>
      <p style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.6, marginBottom: 0 }}>
        Install this module on your phone for faster launch and full-screen access.
      </p>

      {installed ? (
        <p style={{ fontSize: 13, color: 'var(--green)', lineHeight: 1.6, marginTop: 12, marginBottom: 0 }}>
          This app is already installed on this device.
        </p>
      ) : deferredPrompt ? (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn btn-primary" onClick={() => void handleInstall()}>
            Install {appName}
          </button>
          <p style={{ fontSize: 12, color: 'var(--grey)', lineHeight: 1.6, margin: 0 }}>
            On iPhone: open in Safari → Share → Add to Home Screen.
          </p>
        </div>
      ) : isIos ? (
        <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
          <div className="metric-row">
            <span className="metric-label">Step 1</span>
            <span className="metric-value">{isSafari ? 'Tap Share in Safari' : 'Open in Safari'}</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Step 2</span>
            <span className="metric-value">Tap Add to Home Screen</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Step 3</span>
            <span className="metric-value">Launch from home screen</span>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.6, marginTop: 12, marginBottom: 0 }}>
          Open on your phone — supported browsers show an install prompt automatically.
        </p>
      )}
    </div>
  )
}
