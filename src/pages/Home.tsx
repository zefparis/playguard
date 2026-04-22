import { useNavigate } from 'react-router-dom'
import { InstallAppCard } from '../components/InstallAppCard'

export function Home() {
  const nav = useNavigate()

  return (
    <div className="page">
      <div className="logo">🎮 PLAYGUARD</div>
      <h1 className="step-title" style={{ fontSize: 30, marginBottom: 8 }}>Player Verification</h1>
      <p className="step-sub">
        Biometric exclusion enforcement for SA gaming boards.<br />
        Powered by Hybrid Vector — 3 French patents.
      </p>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => nav('/scan')}>
          <div className="badge badge-blue">Live Scan</div>
          <h2 style={{ fontSize: 18, marginBottom: 6 }}>Scan Player</h2>
          <p style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.6 }}>
            Instant biometric verification at entry.<br />
            Returns ALLOWED · MINOR · BANNED verdict.
          </p>
          <button className="btn btn-primary" style={{ marginTop: 20 }}>
            Start Scan →
          </button>
        </div>

        <div className="card" style={{ cursor: 'pointer' }} onClick={() => nav('/banned')}>
          <div className="badge badge-red">Registry</div>
          <h2 style={{ fontSize: 18, marginBottom: 6 }}>Banned Players</h2>
          <p style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.6 }}>
            View and manage the self-exclusion registry.<br />
            Unban players when exclusion period expires.
          </p>
          <button className="btn btn-danger" style={{ marginTop: 20 }}>
            View Registry →
          </button>
        </div>

        <div className="card" style={{ cursor: 'pointer' }} onClick={() => nav('/add-ban')}>
          <div className="badge badge-amber">Add Ban</div>
          <h2 style={{ fontSize: 18, marginBottom: 6 }}>Add to Registry</h2>
          <p style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.6 }}>
            Enroll a new face into the banned collection.<br />
            Self-exclusion or board-mandated exclusion.
          </p>
          <button className="btn btn-amber" style={{ marginTop: 20 }}>
            Add Player →
          </button>
        </div>

        <div className="card" style={{ cursor: 'pointer' }} onClick={() => nav('/events')}>
          <div className="badge badge-blue">Events</div>
          <h2 style={{ fontSize: 18, marginBottom: 6 }}>Event Log</h2>
          <p style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.6 }}>
            Browse scan history and filter by verdict.<br />
            Full audit trail for compliance reporting.
          </p>
          <button className="btn btn-outline" style={{ marginTop: 20 }}>
            View Events →
          </button>
        </div>
      </div>

      <div style={{ marginTop: 40, display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        {['AWS Rekognition', 'GDPR Compliant', 'WCGRB Ready', 'ML-KEM FIPS 203'].map(t => (
          <span key={t} className="badge badge-blue">{t}</span>
        ))}
      </div>

      <InstallAppCard appName="PlayGuard" badgeClassName="badge badge-blue" />
    </div>
  )
}
