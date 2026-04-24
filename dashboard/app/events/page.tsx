'use client'

import { useState, useEffect } from 'react'
import { StatusBar } from '@/components/StatusBar'
import { getEvents, syncQueue } from '@/lib/api'

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([])
  const [verdict, setVerdict] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const data = await getEvents(verdict || undefined, 100)
      setEvents(data.events)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const data = await syncQueue()
      alert(`Synced ${data.flushed} events, ${data.failed} failed`)
      fetchEvents()
    } catch (e) {
      alert('Sync failed: ' + (e as Error).message)
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => { fetchEvents() }, [verdict])

  return (
    <div>
      <div className="container">
        <h1 className="page-title">Event Log</h1>
        <p className="page-subtitle">Browse scan history and filter by verdict</p>

        <StatusBar />

        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <label>Filter by Verdict</label>
              <select value={verdict} onChange={e => setVerdict(e.target.value)}>
                <option value="">All</option>
                <option value="ALLOWED">ALLOWED</option>
                <option value="VERIFY_AGE">VERIFY_AGE</option>
                <option value="MINOR">MINOR</option>
                <option value="BANNED">BANNED</option>
              </select>
            </div>
            <button onClick={fetchEvents} style={{ marginTop: 20 }}>Refresh</button>
            <button onClick={handleSync} disabled={syncing} style={{ marginTop: 20 }}>
              {syncing ? 'Syncing...' : 'Sync Queue'}
            </button>
          </div>
        </div>

        <div className="card">
          {loading ? (
            <p>Loading events...</p>
          ) : events.length === 0 ? (
            <p>No events found.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Scan ID</th>
                  <th>Verdict</th>
                  <th>Player ID</th>
                  <th>Board ID</th>
                  <th>Age Range</th>
                  <th>Ban Detected</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e, i) => (
                  <tr key={i}>
                    <td>{e.scanId?.slice(0, 8)}...</td>
                    <td>
                      <span className={`badge ${e.verdict === 'ALLOWED' ? 'success' : (e.verdict === 'MINOR' || e.verdict === 'VERIFY_AGE') ? 'warning' : 'danger'}`}>
                        {e.verdict}
                      </span>
                    </td>
                    <td>{e.playerId || 'N/A'}</td>
                    <td>{e.boardId || 'N/A'}</td>
                    <td>{e.age?.range?.Low}–{e.age?.range?.High}</td>
                    <td>{e.ban?.detected ? 'YES' : 'NO'}</td>
                    <td>{new Date(e.timestamp).toLocaleString()}</td>
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
