'use client'

export function VerdictCard({ result }: { result: any }) {
  return (
    <div className="verdict-card">
      <div className="header">
        <span className={`verdict ${result.verdict}`}>{result.verdict}</span>
        <span className="timestamp">{new Date(result.timestamp).toLocaleString()}</span>
      </div>
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
