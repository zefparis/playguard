'use client'

import { useState, useRef } from 'react'
import { StatusBar } from '@/components/StatusBar'
import { VerdictCard } from '@/components/VerdictCard'
import { scanPlayer } from '@/lib/api'

export default function ScanPage() {
  const [image, setImage] = useState<string>('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [playerId, setPlayerId] = useState('')
  const [boardId, setBoardId] = useState('')
  const [platform, setPlatform] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch (e) {
      alert('Camera access denied')
    }
  }

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return
    canvasRef.current.width = videoRef.current.videoWidth
    canvasRef.current.height = videoRef.current.videoHeight
    ctx.drawImage(videoRef.current, 0, 0)
    setImage(canvasRef.current.toDataURL('image/jpeg', 0.8))
  }

  const handleScan = async () => {
    if (!image) return
    setLoading(true)
    setResult(null)
    try {
      const res = await scanPlayer(image, playerId || undefined, boardId || undefined, platform || undefined)
      setResult(res.result)
    } catch (e) {
      alert('Scan failed: ' + (e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImage(reader.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div>
      <div className="container">
        <h1 className="page-title">Live Scan</h1>
        <p className="page-subtitle">Capture a player image and get instant verification</p>

        <StatusBar />

        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'grid', gap: 16, marginBottom: 16 }}>
            <div>
              <label>Player ID (optional)</label>
              <input value={playerId} onChange={e => setPlayerId(e.target.value)} placeholder="e.g. player-123" />
            </div>
            <div>
              <label>Board ID (optional)</label>
              <input value={boardId} onChange={e => setBoardId(e.target.value)} placeholder="e.g. WCGRB" />
            </div>
            <div>
              <label>Platform (optional)</label>
              <input value={platform} onChange={e => setPlatform(e.target.value)} placeholder="e.g. web, mobile" />
            </div>
          </div>

          <div style={{ display: 'grid', gap: 16, marginBottom: 16 }}>
            <div>
              <label>Camera</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={startCamera}>Start Camera</button>
                <button onClick={capture}>Capture</button>
              </div>
              <video ref={videoRef} autoPlay playsInline style={{ width: '100%', marginTop: 12, borderRadius: 8 }} />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>

            <div>
              <label>Or upload image</label>
              <input type="file" accept="image/*" onChange={handleFile} />
            </div>
          </div>

          {image && (
            <div style={{ marginBottom: 16 }}>
              <label>Preview</label>
              <img src={image} alt="Preview" style={{ width: '100%', maxWidth: 320, borderRadius: 8 }} />
            </div>
          )}

          <button onClick={handleScan} disabled={!image || loading} style={{ width: '100%' }}>
            {loading ? 'Scanning...' : 'Scan Player'}
          </button>
        </div>

        {result && <VerdictCard result={result} />}
      </div>
    </div>
  )
}
