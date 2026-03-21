import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthUser } from '@/lib/utils/auth'
import { prisma } from '@/lib/prisma/client'
import { formatCHF } from '@/lib/utils'

export default async function AgentDashboard() {
  const user = await getAuthUser()
  if (!user || user.role !== 'AGENT') redirect('/auth/login')

  const agent = await prisma.agentProfile.findUnique({
    where: { userId: user.id },
    include: { regie: true },
  })

  if (!agent) {
    // Agent registered but hasn't linked to a régie yet
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', color: '#1B2A4A', fontSize: 28, marginBottom: 16 }}>Set up your agency</h1>
        <p style={{ color: '#4A5568', marginBottom: 32 }}>
          You need to create a company account or join an existing agency before accessing your dashboard.
        </p>
        <Link href="/api/regie/create-company" style={{
          background: '#1B2A4A', color: 'white', padding: '12px 24px',
          borderRadius: 6, textDecoration: 'none', fontSize: 14, fontWeight: 600,
        }}>
          Create company account →
        </Link>
      </div>
    )
  }

  // Pending applications
  const pendingCerts = await prisma.certificate.count({
    where: {
      isRevoked: false,
      expiresAt: { gte: new Date() },
      OR: [
        { directedRegieId: agent.regieId },
        { directedAgentId: agent.id },
      ],
    },
  })

  // Ghost deliveries for this régie
  const ghostCount = agent.regie.ghostDeliveryCount

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', color: '#1B2A4A', fontSize: 28, margin: 0 }}>
          {agent.regie.name}
        </h1>
        <p style={{ color: '#4A5568', marginTop: 4 }}>
          Welcome, {agent.firstName} · {agent.isVerified ? '✓ Verified' : '⚠️ Unverified — limited access'}
        </p>
      </div>

      {!agent.regie.isVerified && (
        <div style={{ background: '#FEF3C7', border: '1px solid #B45309', borderRadius: 8, padding: '14px 18px', marginBottom: 24, fontSize: 14 }}>
          <strong style={{ color: '#B45309' }}>Complete verification to unlock full dossier access.</strong>
          {' '}Your agency is currently unverified. Verify your agency to access complete tenant dossiers.{' '}
          <Link href={`/api/regie/${agent.regieId}/verify`} style={{ color: '#B45309', fontWeight: 600 }}>
            Verify now →
          </Link>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        <StatCard label="Pending applications" value={pendingCerts} href="/app/agent/applications" />
        <StatCard label="Ghost deliveries" value={ghostCount} href="/app/agent/applications" note="Dossiers waiting" />
        <StatCard label="Verification" value={agent.regie.isVerified ? 'Verified ✓' : 'Pending'} href="/app/agent/settings" />
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <Link href="/app/agent/applications" style={actionCardStyle}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>📋</div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>View applications</div>
          <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>All received dossiers</div>
        </Link>
        <Link href="/app/agent/listings/new" style={{ ...actionCardStyle, background: 'white', color: '#1B2A4A', border: '1px solid #E8ECF0' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>+</div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Post a listing</div>
          <div style={{ fontSize: 13, color: '#4A5568', marginTop: 4 }}>Add a rental property</div>
        </Link>
      </div>
    </div>
  )
}

function StatCard({ label, value, href, note }: { label: string; value: string | number; href: string; note?: string }) {
  return (
    <Link href={href} style={{ background: 'white', border: '1px solid #E8ECF0', borderRadius: 8, padding: '16px 20px', textDecoration: 'none', display: 'block' }}>
      <div style={{ fontSize: 12, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#1B2A4A' }}>{value}</div>
      {note && <div style={{ fontSize: 12, color: '#4A5568', marginTop: 2 }}>{note}</div>}
    </Link>
  )
}

const actionCardStyle: React.CSSProperties = {
  background: '#1B2A4A', color: 'white', padding: '20px 24px',
  borderRadius: 8, textDecoration: 'none', display: 'block',
}
