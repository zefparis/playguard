'use client'

import { useState, useEffect } from 'react'
import { StatusBar } from '@/components/StatusBar'
import { unbanPlayer } from '@/lib/api'

export default function BannedPage() {
  const [banned, setBanned] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchBanned = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3007'}/playguard/status`, {
        headers: { 'x-playguard-key': process.env.NEXT_PUBLIC_PG_API_KEY || '' },
      })
      const data = await res.json()
      if (data.success) {
        const eventsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3007'}/playguard/events?verdict=BANNED&limit=100`, {
          headers: { 'x-playguard-key': process.env.NEXT_PUBLIC_PG_API_KEY || '' },
        })
        const eventsData = await eventsRes.json()
        if (eventsData.success) {
          const faceIds = new Set<string>()
          const unique: any[] = []
          for (const e of eventsData.events) {
            if (e.ban?.faceId && !faceIds.has(e.ban.faceId)) {
              faceIds.add(e.ban.faceId)
              unique.push(e)
            }
          }
          setBanned(unique)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleUnban = async (faceId: string) => {
    if (!confirm('Unban this player?')) return
    try {
      await unbanPlayer(faceId)
      setBanned(banned.filter(b => b.ban?.faceId !== faceId))
    } catch (e) {
      alert('Unban failed: ' + (e as Error).message)
    }
  }

  useEffect(() => { fetchBanned() }, [])

  return (
    <div>
      <div className="container">
        <h1 className="page-title">Banned Players</h1>
        <p className="page-subtitle">View and manage the banned players registry</p>

        <StatusBar />

        <div className="card">
          {loading ? (
            <p>Loading...</p>
          ) : banned.length === 0 ? (
            <p>No banned players found.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Face ID</th>
                  <th>External ID</th>
                  <th>Similarity</th>
                  <th>Timestamp</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {banned.map((b, i) => (
                  <tr key={i}>
                    <td>{b.ban?.faceId?.slice(0, 12)}...</td>
                    <td>{b.ban?.externalId || 'N/A'}</td>
                    <td>{b.ban?.similarity?.toFixed(1)}%</td>
                    <td>{new Date(b.timestamp).toLocaleString()}</td>
                    <td className="actions">
                      <button className="danger" onClick={() => handleUnban(b.ban?.faceId)}>Unban</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
