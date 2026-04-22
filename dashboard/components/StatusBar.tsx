'use client'

import { useEffect, useState } from 'react'
import { getStatus } from '@/lib/api'

export function StatusBar() {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getStatus()
        setStatus(data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 10000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return <div className="status-bar">Loading status...</div>
  if (!status) return <div className="status-bar">Status unavailable</div>

  return (
    <div className="status-bar">
      <div className="status-item">
        <span className="label">Collection</span>
        <span className="value">{status.collection}</span>
      </div>
      <div className="status-item">
        <span className="label">Faces</span>
        <span className="value">{status.collectionSize}</span>
      </div>
      <div className="status-item">
        <span className="label">Queue</span>
        <span className={`value ${status.queueSize > 0 ? 'danger' : 'success'}`}>{status.queueSize}</span>
      </div>
      <div className="status-item">
        <span className="label">Mode</span>
        <span className={`value ${status.mode === 'COLLECT' ? 'warning' : 'success'}`}>{status.mode}</span>
      </div>
      <div className="status-item">
        <span className="label">Region</span>
        <span className="value">{status.awsRegion}</span>
      </div>
      <div className="status-item">
        <span className="label">Age Threshold</span>
        <span className="value">{status.ageThreshold}</span>
      </div>
      <div className="status-item">
        <span className="label">Match Threshold</span>
        <span className="value">{status.matchThreshold}%</span>
      </div>
    </div>
  )
}
