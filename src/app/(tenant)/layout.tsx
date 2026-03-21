import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/utils/auth'

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser()
  if (!user || user.role !== 'TENANT') redirect('/auth/login')

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F7F8FA' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, background: '#1B2A4A', padding: '24px 0', flexShrink: 0,
        display: 'flex', flexDirection: 'column',
      }}>
        <Link href="/app/tenant/dashboard" style={{ padding: '0 24px 24px', textDecoration: 'none' }}>
          <div style={{ fontFamily: 'DM Serif Display, serif', color: 'white', fontSize: 18, fontWeight: 700 }}>
            Swiss<span style={{ color: '#D4001A' }}>Trust</span>
          </div>
        </Link>

        <nav style={{ flex: 1 }}>
          {[
            { href: '/app/tenant/dashboard', icon: '📊', label: 'Dashboard' },
            { href: '/app/tenant/profile', icon: '👤', label: 'My Profile' },
            { href: '/app/tenant/documents', icon: '📄', label: 'Documents' },
            { href: '/app/tenant/certificates', icon: '🏠', label: 'Certificates' },
            { href: '/app/tenant/certificates/new', icon: '+', label: 'New Certificate' },
            { href: '/app/tenant/access-requests', icon: '🔔', label: 'Access Requests' },
            { href: '/app/tenant/access-log', icon: '📋', label: 'Access Log' },
          ].map((item) => (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 24px', textDecoration: 'none',
              color: '#94A3B8', fontSize: 14,
            }}>
              <span style={{ width: 16, textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 12, color: '#4A5568', marginBottom: 8 }}>{user.email}</div>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: 12, cursor: 'pointer', padding: 0 }}>
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto' }}>{children}</main>
    </div>
  )
}
