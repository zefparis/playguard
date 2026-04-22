import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="container">
      <h1 className="page-title">PlayGuard Dashboard</h1>
      <p className="page-subtitle">Online player verification for South African gaming boards</p>

      <div className="status-bar">
        <div className="status-item">
          <span className="label">Status</span>
          <span className="value success">Ready</span>
        </div>
        <div className="status-item">
          <span className="label">Collection</span>
          <span className="value">hv-playguard-banned</span>
        </div>
        <div className="status-item">
          <span className="label">Region</span>
          <span className="value">af-south-1</span>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 24 }}>
        <Link href="/scan" className="card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
          <h2 style={{ fontSize: 18, marginBottom: 6 }}>Live Scan</h2>
          <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.6 }}>
            Capture a player image and get instant verification (ALLOWED / MINOR / BANNED).
          </p>
          <button style={{ marginTop: 20, width: 'auto' }}>Start Scan</button>
        </Link>

        <Link href="/banned" className="card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
          <h2 style={{ fontSize: 18, marginBottom: 6 }}>Banned Players</h2>
          <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.6 }}>
            View and manage the banned players registry. Unban faces when required.
          </p>
          <button style={{ marginTop: 20, width: 'auto' }}>View Registry</button>
        </Link>

        <Link href="/add-ban" className="card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
          <h2 style={{ fontSize: 18, marginBottom: 6 }}>Add Ban</h2>
          <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.6 }}>
            Index a new face into the banned collection with external ID and metadata.
          </p>
          <button style={{ marginTop: 20, width: 'auto' }}>Add Player</button>
        </Link>

        <Link href="/events" className="card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
          <h2 style={{ fontSize: 18, marginBottom: 6 }}>Event Log</h2>
          <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.6 }}>
            Browse scan history and filter by verdict. Export logs for compliance.
          </p>
          <button style={{ marginTop: 20, width: 'auto' }}>View Events</button>
        </Link>
      </div>
    </div>
  )
}
