'use client'

import { useState } from 'react'
import { StatusBar } from '@/components/StatusBar'
import { addBan } from '@/lib/api'

export default function AddBanPage() {
  const [image, setImage] = useState<string>('')
  const [externalId, setExternalId] = useState('')
  const [reason, setReason] = useState('')
  const [operator, setOperator] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImage(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    if (!image || !externalId || !reason || !operator) {
      alert('Please fill all fields')
      return
    }
    setLoading(true)
    setSuccess(false)
    try {
      await addBan(image, externalId, reason, operator)
      setSuccess(true)
      setImage('')
      setExternalId('')
      setReason('')
      setOperator('')
    } catch (e) {
      alert('Add ban failed: ' + (e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="container">
        <h1 className="page-title">Add Ban</h1>
        <p className="page-subtitle">Index a new face into the banned collection</p>

        <StatusBar />

        <div className="card">
          {success && (
            <div style={{ marginBottom: 16, padding: 12, background: 'rgba(34,197,94,0.12)', borderRadius: 8, color: '#22c55e' }}>
              Player added to banned registry successfully.
            </div>
          )}

          <div style={{ display: 'grid', gap: 16, marginBottom: 16 }}>
            <div>
              <label>External ID *</label>
              <input value={externalId} onChange={e => setExternalId(e.target.value)} placeholder="e.g. player-123" />
            </div>
            <div>
              <label>Reason *</label>
              <input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. self-exclusion" />
            </div>
            <div>
              <label>Operator *</label>
              <input value={operator} onChange={e => setOperator(e.target.value)} placeholder="e.g. Casino X" />
            </div>
            <div>
              <label>Face Image *</label>
              <input type="file" accept="image/*" onChange={handleFile} />
            </div>
          </div>

          {image && (
            <div style={{ marginBottom: 16 }}>
              <label>Preview</label>
              <img src={image} alt="Preview" style={{ width: '100%', maxWidth: 320, borderRadius: 8 }} />
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Adding...' : 'Add to Banned Registry'}
          </button>
        </div>
      </div>
    </div>
  )
}
