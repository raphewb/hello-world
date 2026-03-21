import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthUser } from '@/lib/utils/auth'
import { prisma } from '@/lib/prisma/client'
import { daysUntil, formatCHF } from '@/lib/utils'

export default async function TenantDashboard() {
  const user = await getAuthUser()
  if (!user || user.role !== 'TENANT') redirect('/auth/login')

  const profile = await prisma.tenantProfile.findUnique({
    where: { userId: user.id },
    include: {
      documents: { where: { isCurrent: true } },
      certificates: {
        where: { isRevoked: false, expiresAt: { gte: new Date() } },
        orderBy: { createdAt: 'desc' },
        take: 3,
      },
    },
  })

  if (!profile) redirect('/auth/register')

  const expiringDocs = profile.documents.filter(
    (d) => d.expiresAt && daysUntil(d.expiresAt) <= 30 && daysUntil(d.expiresAt) > 0
  )
  const expiredDocs = profile.documents.filter(
    (d) => d.expiresAt && daysUntil(d.expiresAt) <= 0
  )

  const pendingRequests = await prisma.certificateAccess.count({
    where: {
      certificate: { tenantId: profile.id },
      accessType: 'ACCESS_REQUESTED',
      approvedAt: null,
      deniedAt: null,
    },
  })

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', color: '#1B2A4A', fontSize: 28, margin: 0 }}>
          Welcome, {profile.fullName.split(' ')[0]}
        </h1>
        <p style={{ color: '#4A5568', marginTop: 4 }}>Your SwissTrust dossier dashboard</p>
      </div>

      {/* Alerts */}
      {(expiringDocs.length > 0 || expiredDocs.length > 0 || pendingRequests > 0) && (
        <div style={{ marginBottom: 24 }}>
          {expiredDocs.length > 0 && (
            <Alert type="error" icon="⚠️">
              <strong>{expiredDocs.length}</strong> document{expiredDocs.length > 1 ? 's have' : ' has'} expired.{' '}
              <Link href="/app/tenant/documents" style={{ color: '#C41A1A', fontWeight: 600 }}>Update now →</Link>
            </Alert>
          )}
          {expiringDocs.length > 0 && (
            <Alert type="warning" icon="⏳">
              <strong>{expiringDocs.length}</strong> document{expiringDocs.length > 1 ? 's expire' : ' expires'} within 30 days.{' '}
              <Link href="/app/tenant/documents" style={{ color: '#B45309', fontWeight: 600 }}>View →</Link>
            </Alert>
          )}
          {pendingRequests > 0 && (
            <Alert type="info" icon="🔔">
              <strong>{pendingRequests}</strong> pending access request{pendingRequests > 1 ? 's' : ''}.{' '}
              <Link href="/app/tenant/access-requests" style={{ color: '#1D4ED8', fontWeight: 600 }}>Review →</Link>
            </Alert>
          )}
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        <StatCard
          label="Trust Score"
          value={
            <span style={{
              fontSize: 28, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
              color: profile.trustScore === 'A' ? '#1A7A4A' : profile.trustScore === 'B' ? '#B45309' : profile.trustScore === 'C' ? '#C41A1A' : '#6B7280',
            }}>
              {profile.trustScore}
            </span>
          }
          href="/app/tenant/profile"
        />
        <StatCard
          label="Profile Complete"
          value={<span style={{ fontSize: 28, fontWeight: 700, color: '#1B2A4A' }}>{profile.profileCompleteness}%</span>}
          href="/app/tenant/documents"
        />
        <StatCard
          label="Active Certificates"
          value={<span style={{ fontSize: 28, fontWeight: 700, color: '#1B2A4A' }}>{profile.certificates.length}</span>}
          href="/app/tenant/certificates"
        />
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
        <Link href="/app/tenant/certificates/new" style={{
          background: '#1B2A4A', color: 'white', padding: '20px 24px', borderRadius: 8,
          textDecoration: 'none', display: 'block',
        }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>🏠</div>
          <div style={{ fontWeight: 600, fontSize: 16 }}>New Certificate</div>
          <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>Apply for a rental property</div>
        </Link>

        <Link href="/app/tenant/documents" style={{
          background: 'white', color: '#1B2A4A', padding: '20px 24px', borderRadius: 8,
          textDecoration: 'none', display: 'block', border: '1px solid #E8ECF0',
        }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>📄</div>
          <div style={{ fontWeight: 600, fontSize: 16 }}>Upload Documents</div>
          <div style={{ fontSize: 13, color: '#4A5568', marginTop: 4 }}>Add or update your documents</div>
        </Link>
      </div>

      {/* Recent certificates */}
      {profile.certificates.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontFamily: 'DM Serif Display, serif', color: '#1B2A4A', fontSize: 18, margin: 0 }}>Recent Certificates</h2>
            <Link href="/app/tenant/certificates" style={{ fontSize: 13, color: '#1B2A4A' }}>View all →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {profile.certificates.map((cert) => (
              <Link key={cert.id} href={`/app/tenant/certificates/${cert.id}`} style={{
                background: 'white', border: '1px solid #E8ECF0', borderRadius: 8,
                padding: '14px 18px', textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span style={{ fontSize: 20 }}>🏠</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: '#1B2A4A', fontSize: 14 }}>{cert.propertyAddress}</div>
                  <div style={{ fontSize: 12, color: '#4A5568' }}>
                    {formatCHF(cert.monthlyRentChf)}/month · {cert.sharingMode.replace('_', ' ')} · Expires {new Date(cert.expiresAt).toLocaleDateString('fr-CH')}
                  </div>
                </div>
                <span style={{ color: '#9CA3AF' }}>→</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, href }: { label: string; value: React.ReactNode; href: string }) {
  return (
    <Link href={href} style={{
      background: 'white', border: '1px solid #E8ECF0', borderRadius: 8,
      padding: '16px 20px', textDecoration: 'none', display: 'block',
    }}>
      <div style={{ fontSize: 12, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{label}</div>
      {value}
    </Link>
  )
}

function Alert({ type, icon, children }: { type: 'error' | 'warning' | 'info'; icon: string; children: React.ReactNode }) {
  const colors = {
    error: { bg: '#FEE2E2', border: '#C41A1A', text: '#C41A1A' },
    warning: { bg: '#FEF3C7', border: '#B45309', text: '#B45309' },
    info: { bg: '#EFF6FF', border: '#3B82F6', text: '#1D4ED8' },
  }
  const c = colors[type]
  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8,
      padding: '12px 16px', marginBottom: 8, fontSize: 14, color: c.text,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span>{icon}</span>
      <span>{children}</span>
    </div>
  )
}
