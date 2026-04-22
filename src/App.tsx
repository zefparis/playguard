import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Home } from './pages/Home'
import { Scan } from './pages/Scan'
import { BannedList } from './pages/BannedList'
import { AddBan } from './pages/AddBan'
import { Events } from './pages/Events'
import './index.css'

export default function App() {
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
