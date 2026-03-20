import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/utils/auth'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser()
  if (!user || user.role !== 'ADMIN') redirect('/auth/login')

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F7F8FA' }}>
      <aside style={{ width: 220, background: '#0F1A2E', padding: '24px 0', flexShrink: 0 }}>
        <div style={{ padding: '0 24px 24px' }}>
          <div style={{ fontFamily: 'DM Serif Display, serif', color: 'white', fontSize: 18 }}>
            Swiss<span style={{ color: '#D4001A' }}>Trust</span>
          </div>
          <div style={{ fontSize: 11, color: '#4A5568', marginTop: 2 }}>Admin Panel</div>
        </div>
        <nav>
          {[
            { href: '/admin/dashboard', icon: '📊', label: 'Overview' },
            { href: '/admin/users', icon: '👥', label: 'Users' },
            { href: '/admin/verification-queue', icon: '🔍', label: 'Verification queue' },
            { href: '/admin/ghost-deliveries', icon: '👻', label: 'Ghost deliveries' },
          ].map((item) => (
            <Link key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 24px', textDecoration: 'none', color: '#94A3B8', fontSize: 14 }}>
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main style={{ flex: 1, overflow: 'auto' }}>{children}</main>
    </div>
  )
}
