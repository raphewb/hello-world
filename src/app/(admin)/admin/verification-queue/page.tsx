import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthUser } from '@/lib/utils/auth'
import { prisma } from '@/lib/prisma/client'
import { getSignedDocumentUrl } from '@/lib/supabase/storage'

export default async function VerificationQueuePage() {
  const user = await getAuthUser()
  if (!user || user.role !== 'ADMIN') redirect('/auth/login')

  const pendingDocuments = await prisma.document.findMany({
    where: { verificationStatus: 'PENDING', isCurrent: true },
    include: {
      tenant: { select: { fullName: true, userId: true } },
    },
    orderBy: { uploadedAt: 'asc' },
    take: 50,
  })

  const pendingRegies = await prisma.regie.findMany({
    where: { hasAccount: true, isVerified: false },
    include: { agents: { select: { firstName: true, lastName: true, isCompanyAdmin: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ fontFamily: 'DM Serif Display, serif', color: '#1B2A4A', fontSize: 28, marginBottom: 32 }}>
        Verification Queue
      </h1>

      {/* Document queue */}
      <h2 style={{ fontSize: 18, color: '#1B2A4A', marginBottom: 16, fontFamily: 'DM Serif Display, serif' }}>
        Documents ({pendingDocuments.length})
      </h2>

      {pendingDocuments.length === 0 ? (
        <div style={{ background: '#F7F8FA', border: '1px solid #E8ECF0', borderRadius: 8, padding: 20, textAlign: 'center', color: '#4A5568', marginBottom: 32 }}>
          ✓ No documents pending review
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
          {pendingDocuments.map((doc) => (
            <div key={doc.id} style={{ background: 'white', border: '1px solid #E8ECF0', borderRadius: 8, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#1B2A4A', fontSize: 14 }}>{doc.type.replace('_', ' ')}</div>
                <div style={{ fontSize: 12, color: '#4A5568' }}>
                  {doc.tenant.fullName} · Uploaded {new Date(doc.uploadedAt).toLocaleDateString('fr-CH')}
                  {doc.aiRejectionReason && (
                    <span style={{ color: '#C41A1A', marginLeft: 8 }}>⚠️ {doc.aiRejectionReason}</span>
                  )}
                </div>
                {doc.aiConfidenceScore !== null && (
                  <div style={{ fontSize: 12, color: '#B45309' }}>
                    AI confidence: {Math.round(doc.aiConfidenceScore * 100)}% — requires manual review
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <AdminVerifyDocForm documentId={doc.id} action="approve" />
                <AdminVerifyDocForm documentId={doc.id} action="reject" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Régie queue */}
      <h2 style={{ fontSize: 18, color: '#1B2A4A', marginBottom: 16, fontFamily: 'DM Serif Display, serif' }}>
        Régie Verification ({pendingRegies.length})
      </h2>

      {pendingRegies.length === 0 ? (
        <div style={{ background: '#F7F8FA', border: '1px solid #E8ECF0', borderRadius: 8, padding: 20, textAlign: 'center', color: '#4A5568' }}>
          ✓ No agencies pending verification
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pendingRegies.map((regie) => {
            const admin = regie.agents.find((a) => a.isCompanyAdmin)
            return (
              <div key={regie.id} style={{ background: 'white', border: '1px solid #E8ECF0', borderRadius: 8, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: '#1B2A4A' }}>{regie.name}</div>
                  <div style={{ fontSize: 12, color: '#4A5568' }}>
                    {regie.address} · Canton {regie.canton}
                    {admin && ` · Admin: ${admin.firstName} ${admin.lastName}`}
                    {regie.svitMembershipNumber && ` · SVIT: ${regie.svitMembershipNumber}`}
                  </div>
                </div>
                <AdminVerifyRegieForm regieId={regie.id} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AdminVerifyDocForm({ documentId, action }: { documentId: string; action: 'approve' | 'reject' }) {
  return (
    <form action={`/api/admin/verify-document/${documentId}`} method="POST">
      <input type="hidden" name="action" value={action} />
      <button type="submit" style={{
        background: action === 'approve' ? '#1A7A4A' : '#C41A1A', color: 'white',
        border: 'none', padding: '6px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600,
      }}>
        {action === 'approve' ? '✓ Approve' : '✗ Reject'}
      </button>
    </form>
  )
}

function AdminVerifyRegieForm({ regieId }: { regieId: string }) {
  return (
    <form action={`/api/admin/verify-regie/${regieId}`} method="POST">
      <input type="hidden" name="action" value="approve" />
      <button type="submit" style={{
        background: '#1A7A4A', color: 'white', border: 'none',
        padding: '6px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600,
      }}>
        ✓ Verify Agency
      </button>
    </form>
  )
}
