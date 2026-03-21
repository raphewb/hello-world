'use client'

import Link from 'next/link'
import { formatCHF } from '@/lib/utils'
import type { CertificatePublicSummary, CertificateFullDossier } from '@/types'

type Result =
  | { tier: 'public'; data: CertificatePublicSummary }
  | { tier: 'full'; data: CertificateFullDossier }
  | { tier: 'request'; data: CertificatePublicSummary; accessId: string | null }
  | { tier: 'expired' }
  | { tier: 'revoked' }

type Props = {
  result: Result
  certificateId: string
  isLoggedIn: boolean
  viewerRole?: string
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  PASSPORT: 'Passport / ID',
  RESIDENCE_PERMIT: 'Residence Permit',
  SALARY_SLIP_1: 'Salary Slip',
  SALARY_SLIP_2: 'Salary Slip (2)',
  SALARY_SLIP_3: 'Salary Slip (3)',
  TAX_RETURN: 'Tax Return',
  BETREIBUNGSAUSZUG: 'Betreibungsauszug',
  REFERENCE_LETTER: 'Reference Letter',
  RENTAL_GUARANTEE: 'Rental Guarantee',
  LIABILITY_INSURANCE: 'Liability Insurance',
  EMPLOYMENT_CONTRACT: 'Employment Contract',
  OTHER: 'Other Document',
}

const DOCUMENT_ICONS: Record<string, string> = {
  PASSPORT: '🪪',
  RESIDENCE_PERMIT: '📋',
  SALARY_SLIP_1: '💶',
  SALARY_SLIP_2: '💶',
  SALARY_SLIP_3: '💶',
  TAX_RETURN: '📊',
  BETREIBUNGSAUSZUG: '⚖️',
  REFERENCE_LETTER: '📝',
  RENTAL_GUARANTEE: '🏦',
  LIABILITY_INSURANCE: '🛡️',
  EMPLOYMENT_CONTRACT: '📄',
  OTHER: '📎',
}

export function CertificatePublicView({ result, certificateId, isLoggedIn, viewerRole }: Props) {
  if (result.tier === 'expired') {
    return <StatusPage icon="⏱️" title="Certificate Expired" message="This certificate has expired. Please contact the tenant to request a new one." color="#B45309" />
  }

  if (result.tier === 'revoked') {
    return <StatusPage icon="🚫" title="Certificate Revoked" message="This certificate has been revoked by the tenant and is no longer valid." color="#C41A1A" />
  }

  const summary = result.data as CertificatePublicSummary
  const fullData = result.tier === 'full' ? (result.data as CertificateFullDossier) : null

  return (
    <div className="cert-page">
      {/* Header */}
      <div style={{ background: '#1B2A4A', padding: '0' }}>
        <div className="max-w-lg mx-auto px-6 py-8">
          {/* Avatar + Name */}
          <div className="flex items-center gap-4">
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: '#D4001A', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, fontWeight: 700, fontFamily: 'DM Serif Display, serif',
              flexShrink: 0,
            }}>
              {summary.avatarInitials}
            </div>
            <div>
              <h1 style={{ color: 'white', margin: 0, fontSize: 22, fontFamily: 'DM Serif Display, serif' }}>
                {summary.tenantName}
              </h1>
              <div style={{ color: '#94A3B8', fontSize: 13, marginTop: 4 }}>
                Verified Tenant · {summary.profileCompleteness}% complete
              </div>
            </div>
          </div>

          {/* Trust Score */}
          <div className="mt-6 flex items-center gap-3">
            <div className={`trust-score-badge trust-score-${summary.trustScore}`}
              style={{ fontSize: 28, padding: '8px 20px', borderRadius: 8 }}>
              {summary.trustScore}
            </div>
            <div>
              <div style={{ color: '#94A3B8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Trust Score</div>
              <div style={{ color: 'white', fontSize: 14, marginTop: 2 }}>
                {summary.trustScore === 'A' ? 'Excellent — all documents verified' :
                 summary.trustScore === 'B' ? 'Good — most documents verified' :
                 summary.trustScore === 'C' ? 'In progress' : 'Not yet rated'}
              </div>
            </div>

            {/* Verification badge */}
            {summary.verificationStatus === 'VERIFIED' && (
              <div className="verify-badge-animate ml-auto" style={{ color: '#4ADE80', fontSize: 28 }}>✓</div>
            )}
          </div>
        </div>
      </div>

      {/* Property info bar */}
      <div style={{ background: '#F7F8FA', borderBottom: '1px solid #E8ECF0' }}>
        <div className="max-w-lg mx-auto px-6 py-3">
          <div style={{ fontSize: 12, color: '#4A5568', textTransform: 'uppercase', letterSpacing: 0.5 }}>Application for</div>
          <div style={{ fontWeight: 600, color: '#1B2A4A' }}>{summary.propertyAddress}</div>
          <div style={{ fontSize: 14, color: '#4A5568' }}>{formatCHF(summary.monthlyRentChf)}/month</div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-lg mx-auto px-6 py-6">

        {/* Rent eligibility */}
        <div style={{
          background: summary.qualifiesForRent ? '#DCFCE7' : '#FEF3C7',
          border: `1px solid ${summary.qualifiesForRent ? '#1A7A4A' : '#B45309'}`,
          borderRadius: 8, padding: '14px 18px', marginBottom: 20,
        }}>
          <div style={{ fontWeight: 600, color: summary.qualifiesForRent ? '#1A7A4A' : '#B45309', fontSize: 14 }}>
            {summary.qualifiesForRent
              ? `✓ Income qualifies · ${formatCHF(summary.rentEligibilityMin)}–${formatCHF(summary.rentEligibilityMax)}/month eligibility range`
              : '⚠ Income may not meet the 3× rent threshold for this property'}
          </div>
        </div>

        {/* Key facts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <Fact label="Occupants" value={`${summary.occupantCount} person${summary.occupantCount > 1 ? 's' : ''}`} />
          <Fact label="Smoker" value={summary.isSmoker ? 'Yes' : 'No'} />
          <Fact label="Pets" value={summary.hasPets ? (summary.petDetails || 'Yes') : 'No'} />
          <Fact label="Documents verified" value={`${summary.documentsVerifiedCount} / ${summary.documentsTotalCount}`} />
        </div>

        {/* Profile completeness bar */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: '#4A5568' }}>Profile completeness</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1B2A4A' }}>{summary.profileCompleteness}%</span>
          </div>
          <div style={{ height: 6, background: '#E8ECF0', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3,
              width: `${summary.profileCompleteness}%`,
              background: summary.profileCompleteness >= 80 ? '#1A7A4A' : summary.profileCompleteness >= 50 ? '#B45309' : '#C41A1A',
              transition: 'width 0.8s ease',
            }} />
          </div>
        </div>

        {/* Documents section */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1B2A4A', marginBottom: 12, fontFamily: 'DM Serif Display, serif' }}>
            Documents
          </h2>

          {result.tier === 'full' && fullData ? (
            // Full dossier — show actual documents with signed URLs
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {fullData.documents.map((doc) => (
                <a key={doc.id} href={doc.signedUrl} target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: 'white', border: '1px solid #E8ECF0',
                    borderRadius: 8, padding: '12px 16px', textDecoration: 'none',
                    cursor: 'pointer',
                  }}>
                  <span style={{ fontSize: 20 }}>{DOCUMENT_ICONS[doc.type] ?? '📎'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: '#1B2A4A', fontSize: 14 }}>
                      {DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type}
                    </div>
                    {doc.expiresAt && (
                      <div style={{ fontSize: 12, color: '#4A5568' }}>
                        Expires {new Date(doc.expiresAt).toLocaleDateString('fr-CH')}
                      </div>
                    )}
                  </div>
                  <DocStatusBadge status={doc.verificationStatus} />
                  <span style={{ color: '#1B2A4A', fontSize: 16 }}>↗</span>
                </a>
              ))}
            </div>
          ) : (
            // Public view — show locked documents
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['PASSPORT', 'BETREIBUNGSAUSZUG', 'SALARY_SLIP_1', 'REFERENCE_LETTER', 'LIABILITY_INSURANCE'].map((type) => (
                <div key={type} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: '#F7F8FA', border: '1px solid #E8ECF0',
                  borderRadius: 8, padding: '12px 16px', opacity: 0.7,
                }}>
                  <span style={{ fontSize: 20 }}>{DOCUMENT_ICONS[type]}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#1B2A4A', fontSize: 14 }}>{DOCUMENT_TYPE_LABELS[type]}</div>
                  </div>
                  <span style={{ color: '#9CA3AF', fontSize: 18 }}>🔒</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Full dossier data (if authorised) */}
        {result.tier === 'full' && fullData && (
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1B2A4A', marginBottom: 12, fontFamily: 'DM Serif Display, serif' }}>
              Tenant Details
            </h2>
            <div style={{ background: 'white', border: '1px solid #E8ECF0', borderRadius: 8, padding: '16px 20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Fact label="Nationality" value={fullData.nationality ?? '—'} />
                <Fact label="Residence Permit" value={fullData.residencePermitType.replace('PERMIT_', 'Permit ').replace('CITIZEN', 'Swiss Citizen')} />
                <Fact label="Employment" value={fullData.employmentType.replace('_', ' ')} />
                {fullData.employerName && <Fact label="Employer" value={fullData.employerName} />}
                {fullData.currentAddress && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <Fact label="Current Address" value={fullData.currentAddress} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ON_REQUEST — request access button */}
        {result.tier === 'request' && (
          <RequestAccessPanel
            certificateId={certificateId}
            isLoggedIn={isLoggedIn}
            viewerRole={viewerRole}
            existingRequestId={result.accessId}
          />
        )}

        {/* Not logged in — prompt */}
        {result.tier === 'public' && (viewerRole === undefined || !isLoggedIn) && (
          <div style={{
            background: '#F7F8FA', border: '1px solid #E8ECF0', borderRadius: 8,
            padding: '20px', textAlign: 'center', marginBottom: 24,
          }}>
            <p style={{ color: '#4A5568', marginBottom: 12, fontSize: 14 }}>
              Sign in as a verified property professional to request full dossier access.
            </p>
            <Link href={`/auth/login?redirectTo=/c/${certificateId}`}
              style={{
                display: 'inline-block', background: '#1B2A4A', color: 'white',
                padding: '10px 20px', borderRadius: 6, textDecoration: 'none', fontSize: 14,
              }}>
              Sign in →
            </Link>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #E8ECF0', padding: '16px 24px', textAlign: 'center' }}>
        <p style={{ color: '#9CA3AF', fontSize: 11, margin: 0 }}>
          Verified by{' '}
          <Link href="/" style={{ color: '#1B2A4A', textDecoration: 'none', fontWeight: 600 }}>
            SwissTrust
          </Link>
          {' · '}Expires {new Date(summary.expiresAt).toLocaleDateString('fr-CH')}
          {' · '}nFADP compliant
        </p>
      </div>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 500, color: '#1B2A4A', marginTop: 2 }}>{value}</div>
    </div>
  )
}

function DocStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string; bg: string }> = {
    VERIFIED: { label: 'Verified', color: '#1A7A4A', bg: '#DCFCE7' },
    PENDING: { label: 'Pending', color: '#B45309', bg: '#FEF3C7' },
    REJECTED: { label: 'Rejected', color: '#C41A1A', bg: '#FEE2E2' },
    EXPIRED: { label: 'Expired', color: '#6B7280', bg: '#F3F4F6' },
    EXPIRING_SOON: { label: 'Expiring', color: '#B45309', bg: '#FEF3C7' },
  }
  const c = config[status] ?? config.PENDING
  return (
    <span style={{
      background: c.bg, color: c.color, fontSize: 11, fontWeight: 600,
      padding: '2px 8px', borderRadius: 4,
    }}>
      {c.label}
    </span>
  )
}

function RequestAccessPanel({
  certificateId, isLoggedIn, viewerRole, existingRequestId,
}: {
  certificateId: string
  isLoggedIn: boolean
  viewerRole?: string
  existingRequestId: string | null
}) {
  if (!isLoggedIn) {
    return (
      <div style={{ background: '#F7F8FA', border: '1px solid #E8ECF0', borderRadius: 8, padding: 20, textAlign: 'center', marginBottom: 24 }}>
        <p style={{ color: '#4A5568', fontSize: 14, marginBottom: 12 }}>Sign in to request full dossier access.</p>
        <Link href={`/auth/login?redirectTo=/c/${certificateId}`}
          style={{ display: 'inline-block', background: '#1B2A4A', color: 'white', padding: '10px 20px', borderRadius: 6, textDecoration: 'none', fontSize: 14 }}>
          Sign in →
        </Link>
      </div>
    )
  }

  if (existingRequestId) {
    return (
      <div style={{ background: '#EFF6FF', border: '1px solid #3B82F6', borderRadius: 8, padding: 20, textAlign: 'center', marginBottom: 24 }}>
        <p style={{ color: '#1D4ED8', fontSize: 14, margin: 0 }}>
          ⏳ Access request sent. You'll receive an email when approved.
        </p>
      </div>
    )
  }

  return (
    <div style={{ background: 'white', border: '1px solid #E8ECF0', borderRadius: 8, padding: 20, textAlign: 'center', marginBottom: 24 }}>
      <h3 style={{ color: '#1B2A4A', marginBottom: 8, fontFamily: 'DM Serif Display, serif' }}>
        Request Full Dossier Access
      </h3>
      <p style={{ color: '#4A5568', fontSize: 14, marginBottom: 16 }}>
        This tenant controls access to their documents. Request access and they'll be notified.
      </p>
      <RequestAccessButton certificateId={certificateId} />
    </div>
  )
}

function RequestAccessButton({ certificateId }: { certificateId: string }) {
  return (
    <button
      onClick={async () => {
        await fetch(`/api/certificate/${certificateId}/request-access`, { method: 'POST' })
        window.location.reload()
      }}
      style={{
        background: '#1B2A4A', color: 'white', border: 'none',
        padding: '12px 24px', borderRadius: 6, fontSize: 15, cursor: 'pointer', fontWeight: 600,
      }}>
      Request Full Access
    </button>
  )
}

function StatusPage({ icon, title, message, color }: { icon: string; title: string; message: string; color: string }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F7F8FA', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
        <h1 style={{ color, fontFamily: 'DM Serif Display, serif', marginBottom: 12 }}>{title}</h1>
        <p style={{ color: '#4A5568', lineHeight: 1.6 }}>{message}</p>
        <Link href="/" style={{ display: 'inline-block', marginTop: 24, background: '#1B2A4A', color: 'white', padding: '10px 20px', borderRadius: 6, textDecoration: 'none' }}>
          Back to SwissTrust
        </Link>
      </div>
    </div>
  )
}
