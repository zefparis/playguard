'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Nav() {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  return (
    <nav className="nav">
      <div className="logo">PlayGuard</div>
      <div className="links">
        <Link href="/" className={isActive('/') ? 'active' : ''}>Home</Link>
        <Link href="/scan" className={isActive('/scan') ? 'active' : ''}>Scan</Link>
        <Link href="/banned" className={isActive('/banned') ? 'active' : ''}>Banned</Link>
        <Link href="/add-ban" className={isActive('/add-ban') ? 'active' : ''}>Add Ban</Link>
        <Link href="/events" className={isActive('/events') ? 'active' : ''}>Events</Link>
      </div>
    </nav>
  )
}
