'use client'

// Verdict color mapping:
//   ALLOWED     → green
//   VERIFY_AGE  → amber (distinct from MINOR)
//   MINOR       → orange
//   BANNED      → red
const VERDICT_STYLES: Record<string, { bg: string; fg: string; border: string; icon: string; title: string }> = {
  ALLOWED:    { bg: 'rgba(34,197,94,0.12)',  fg: '#22c55e', border: '#22c55e', icon: '✅', title: 'ALLOWED' },
  VERIFY_AGE: { bg: 'rgba(245,158,11,0.12)', fg: '#f59e0b', border: '#f59e0b', icon: '⚠️', title: 'VERIFY AGE' },
  MINOR:      { bg: 'rgba(249,115,22,0.14)', fg: '#f97316', border: '#f97316', icon: '🚫', title: 'MINOR' },
  BANNED:     { bg: 'rgba(239,68,68,0.14)',  fg: '#ef4444', border: '#ef4444', icon: '⛔', title: 'BANNED' },
}

export function VerdictCard({ result }: { result: any }) {
  const v: string = result.verdict
  const style = VERDICT_STYLES[v] ?? VERDICT_STYLES.ALLOWED

  return (
    <div className="verdict-card">
      <div className="header">
        <span className={`verdict ${v}`}>{v}</span>
        <span className="timestamp">{new Date(result.timestamp).toLocaleString()}</span>
      </div>

      {v === 'VERIFY_AGE' && (
        <div
          role="alert"
          style={{
            marginBottom: 14,
            padding: 12,
            borderRadius: 8,
            background: style.bg,
            borderLeft: `4px solid ${style.border}`,
            color: style.fg,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14 }}>
            <span>{style.icon}</span>
            <span>{style.title}</span>
          </div>
          <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.45, color: style.fg }}>
            Age range: {result.age.range.Low}–{result.age.range.High} yrs — Physical ID required
          </div>
          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-dim, #94a3b8)' }}>
            {result.age.ambiguityNote ?? 'AWS estimate uncertain. Request ID document before granting access.'}
          </div>
        </div>
      )}

      <div className="details">
        <div className="detail">
          <span className="label">Access</span>
          <span className="value">{result.access ? 'GRANTED' : 'DENIED'}</span>
        </div>
        <div className="detail">
          <span className="label">Age Range</span>
          <span className="value">{result.age.range.Low}–{result.age.range.High}</span>
        </div>
        <div className="detail">
          <span className="label">Minor</span>
          <span className="value">{result.age.isMinor ? 'YES' : 'NO'}</span>
        </div>
        <div className="detail">
          <span className="label">Ambiguous</span>
          <span className="value">{result.age.isAmbiguous ? 'YES' : 'NO'}</span>
        </div>
        <div className="detail">
          <span className="label">Ban Detected</span>
          <span className="value">{result.ban.detected ? 'YES' : 'NO'}</span>
        </div>
        {result.ban.detected && (
          <>
            <div className="detail">
              <span className="label">Similarity</span>
              <span className="value">{result.ban.similarity?.toFixed(1)}%</span>
            </div>
            <div className="detail">
              <span className="label">Face ID</span>
              <span className="value">{result.ban.faceId?.slice(0, 12)}...</span>
            </div>
            <div className="detail">
              <span className="label">External ID</span>
              <span className="value">{result.ban.externalId || 'N/A'}</span>
            </div>
          </>
        )}
        <div className="detail">
          <span className="label">Face Confidence</span>
          <span className="value">{result.faceConfidence.toFixed(1)}%</span>
        </div>
        <div className="detail">
          <span className="label">Brightness</span>
          <span className="value">{result.quality.Brightness.toFixed(1)}</span>
        </div>
        <div className="detail">
          <span className="label">Sharpness</span>
          <span className="value">{result.quality.Sharpness.toFixed(1)}</span>
        </div>
        {result.playerId && (
          <div className="detail">
            <span className="label">Player ID</span>
            <span className="value">{result.playerId}</span>
          </div>
        )}
        {result.boardId && (
          <div className="detail">
            <span className="label">Board ID</span>
            <span className="value">{result.boardId}</span>
          </div>
        )}
      </div>
    </div>
  )
}
