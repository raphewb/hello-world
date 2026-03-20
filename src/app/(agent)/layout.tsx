import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/utils/auth'

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser()
  if (!user || user.role !== 'AGENT') redirect('/auth/login')

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F7F8FA' }}>
      <aside style={{ width: 220, background: '#1B2A4A', padding: '24px 0', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <Link href="/app/agent/dashboard" style={{ padding: '0 24px 24px', textDecoration: 'none' }}>
          <div style={{ fontFamily: 'DM Serif Display, serif', color: 'white', fontSize: 18, fontWeight: 700 }}>
            Swiss<span style={{ color: '#D4001A' }}>Trust</span>
          </div>
          <div style={{ fontSize: 11, color: '#4A5568', marginTop: 2 }}>Agency portal</div>
        </Link>
        <nav style={{ flex: 1 }}>
          {[
            { href: '/app/agent/dashboard', icon: '📊', label: 'Dashboard' },
            { href: '/app/agent/applications', icon: '📋', label: 'Applications' },
            { href: '/app/agent/listings', icon: '🏠', label: 'Listings' },
            { href: '/app/agent/team', icon: '👥', label: 'Team' },
          ].map((item) => (
            <Link key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 24px', textDecoration: 'none', color: '#94A3B8', fontSize: 14 }}>
              <span style={{ width: 16, textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 12, color: '#4A5568' }}>{user.email}</div>
        </div>
      </aside>
      <main style={{ flex: 1, overflow: 'auto' }}>{children}</main>
    </div>
  )
}
