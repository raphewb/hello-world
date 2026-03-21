import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/utils/auth'
import { prisma } from '@/lib/prisma/client'

export default async function AdminDashboard() {
  const user = await getAuthUser()
  if (!user || user.role !== 'ADMIN') redirect('/auth/login')

  const [
    totalUsers,
    totalTenants,
    totalAgents,
    totalRegies,
    pendingDocs,
    pendingRegies,
    ghostDeliveries,
    totalCerts,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.tenantProfile.count(),
    prisma.agentProfile.count(),
    prisma.regie.count(),
    prisma.document.count({ where: { verificationStatus: 'PENDING', isCurrent: true } }),
    prisma.regie.count({ where: { hasAccount: true, isVerified: false } }),
    prisma.ghostDelivery.count({ where: { convertedAt: null } }),
    prisma.certificate.count(),
  ])

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ fontFamily: 'DM Serif Display, serif', color: '#1B2A4A', fontSize: 28, marginBottom: 32 }}>
        Platform Overview
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Total users', value: totalUsers },
          { label: 'Tenants', value: totalTenants },
          { label: 'Agents', value: totalAgents },
          { label: 'Régies', value: totalRegies },
        ].map((s) => (
          <div key={s.label} style={{ background: 'white', border: '1px solid #E8ECF0', borderRadius: 8, padding: '16px 20px' }}>
            <div style={{ fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#1B2A4A' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        <QueueCard href="/admin/verification-queue" icon="🔍" title="Document verification queue" count={pendingDocs} color="#B45309" />
        <QueueCard href="/admin/verification-queue" icon="🏢" title="Régie verification queue" count={pendingRegies} color="#1B2A4A" />
        <QueueCard href="/admin/ghost-deliveries" icon="👻" title="Pending ghost deliveries" count={ghostDeliveries} color="#4A5568" />
        <QueueCard href="/admin/users" icon="🏠" title="Total certificates issued" count={totalCerts} color="#1A7A4A" />
      </div>
    </div>
  )
}

function QueueCard({ href, icon, title, count, color }: { href: string; icon: string; title: string; count: number; color: string }) {
  return (
    <a href={href} style={{ background: 'white', border: '1px solid #E8ECF0', borderRadius: 8, padding: '20px', textDecoration: 'none', display: 'block' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
          <div style={{ fontSize: 14, color: '#4A5568' }}>{title}</div>
        </div>
        <div style={{ fontSize: 36, fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace' }}>{count}</div>
      </div>
    </a>
  )
}
