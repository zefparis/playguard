import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Home } from './pages/Home'
import { Scan } from './pages/Scan'
import { BannedList } from './pages/BannedList'
import { AddBan } from './pages/AddBan'
import { Events } from './pages/Events'
import { PinGate } from './components/PinGate'
import { getToken } from './services/session'
import './index.css'

export default function App() {
  const [authed, setAuthed] = useState(() => getToken() !== null)

  // apiFetch emits 'pg:unauthorized' when the proxy rejects the session
  // (expired/invalid token) — drop back to the PIN gate.
  useEffect(() => {
    const onUnauthorized = () => setAuthed(false)
    window.addEventListener('pg:unauthorized', onUnauthorized)
    return () => window.removeEventListener('pg:unauthorized', onUnauthorized)
  }, [])

  if (!authed) return <PinGate onSuccess={() => setAuthed(true)} />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"        element={<Home />} />
        <Route path="/scan"    element={<Scan />} />
        <Route path="/banned"  element={<BannedList />} />
        <Route path="/add-ban" element={<AddBan />} />
        <Route path="/events"  element={<Events />} />
      </Routes>
    </BrowserRouter>
  )
}
