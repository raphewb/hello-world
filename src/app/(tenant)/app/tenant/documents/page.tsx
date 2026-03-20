'use client'

import { useEffect, useState } from 'react'
import { daysUntil, formatCHF } from '@/lib/utils'

type Document = {
  id: string
  type: string
  fileName: string
  verificationStatus: string
  aiConfidenceScore: number | null
  validFrom: string | null
  expiresAt: string | null
  uploadedAt: string
  signedUrl: string
  fileSizeBytes: number
}

const DOCUMENT_TYPES = [
  { value: 'PASSPORT', label: 'Passport / National ID', icon: '🪪', required: true, weight: '20%' },
  { value: 'BETREIBUNGSAUSZUG', label: 'Betreibungsauszug', icon: '⚖️', required: true, weight: '20%', note: 'Valid 3 months' },
  { value: 'SALARY_SLIP_1', label: 'Salary Slip (most recent)', icon: '💶', required: true, weight: '20%' },
  { value: 'SALARY_SLIP_2', label: 'Salary Slip (2 months ago)', icon: '💶', required: false, weight: '' },
  { value: 'SALARY_SLIP_3', label: 'Salary Slip (3 months ago)', icon: '💶', required: false, weight: '' },
  { value: 'RESIDENCE_PERMIT', label: 'Residence Permit', icon: '📋', required: false, weight: '10%' },
  { value: 'REFERENCE_LETTER', label: 'Reference Letter', icon: '📝', required: false, weight: '10%' },
  { value: 'LIABILITY_INSURANCE', label: 'Liability Insurance', icon: '🛡️', required: false, weight: '10%' },
  { value: 'RENTAL_GUARANTEE', label: 'Rental Guarantee', icon: '🏦', required: false, weight: '10%' },
  { value: 'TAX_RETURN', label: 'Tax Return', icon: '📊', required: false, weight: '' },
  { value: 'EMPLOYMENT_CONTRACT', label: 'Employment Contract', icon: '📄', required: false, weight: '' },
]

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [uploading, setUploading] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDocuments()
  }, [])

  async function fetchDocuments() {
    setLoading(true)
    const res = await fetch('/api/tenant/documents')
    const data = await res.json()
    if (data.success) setDocuments(data.data)
    setLoading(false)
  }

  async function handleUpload(type: string, file: File) {
    setUploading(type)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)

    const res = await fetch('/api/tenant/documents', { method: 'POST', body: formData })
    const data = await res.json()

    if (!data.success) {
      setError(data.error)
    } else {
      await fetchDocuments()
    }
    setUploading(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this document?')) return
    await fetch(`/api/tenant/documents/${id}`, { method: 'DELETE' })
    await fetchDocuments()
  }

  const docByType = Object.fromEntries(documents.map((d) => [d.type, d]))

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ fontFamily: 'DM Serif Display, serif', color: '#1B2A4A', fontSize: 28, marginBottom: 8 }}>
        Documents
      </h1>
      <p style={{ color: '#4A5568', marginBottom: 32 }}>
        Upload and manage your dossier documents. AI verification runs automatically.
      </p>

      {error && (
        <div style={{ background: '#FEE2E2', border: '1px solid #C41A1A', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#C41A1A', fontSize: 14 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {DOCUMENT_TYPES.map((dt) => {
          const doc = docByType[dt.value]
          const isUploading = uploading === dt.value
          const expiringSoon = doc?.expiresAt && daysUntil(doc.expiresAt) <= 30
          const expired = doc?.expiresAt && daysUntil(doc.expiresAt) <= 0

          return (
            <div key={dt.value} style={{
              background: 'white', border: `1px solid ${expired ? '#C41A1A' : expiringSoon ? '#B45309' : '#E8ECF0'}`,
              borderRadius: 8, padding: '16px 20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>{dt.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600, color: '#1B2A4A', fontSize: 14 }}>{dt.label}</span>
                    {dt.required && (
                      <span style={{ fontSize: 10, background: '#FEE2E2', color: '#C41A1A', padding: '1px 6px', borderRadius: 3, fontWeight: 600 }}>
                        REQUIRED
                      </span>
                    )}
                    {dt.weight && (
                      <span style={{ fontSize: 10, color: '#9CA3AF' }}>+{dt.weight}</span>
                    )}
                  </div>
                  {dt.note && <div style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>⚠️ {dt.note}</div>}
                  {doc && (
                    <div style={{ fontSize: 12, color: '#4A5568', marginTop: 4 }}>
                      {doc.fileName} · Uploaded {new Date(doc.uploadedAt).toLocaleDateString('fr-CH')}
                      {doc.expiresAt && (
                        <span style={{ color: expired ? '#C41A1A' : expiringSoon ? '#B45309' : '#1A7A4A', marginLeft: 8 }}>
                          {expired ? `⚠️ Expired ${Math.abs(daysUntil(doc.expiresAt))} days ago`
                            : expiringSoon ? `⏳ Expires in ${daysUntil(doc.expiresAt)} days`
                            : `✓ Valid until ${new Date(doc.expiresAt).toLocaleDateString('fr-CH')}`}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {doc && <StatusBadge status={doc.verificationStatus} confidence={doc.aiConfidenceScore} />}

                <div style={{ display: 'flex', gap: 8 }}>
                  {isUploading ? (
                    <span style={{ fontSize: 12, color: '#4A5568' }}>Verifying…</span>
                  ) : (
                    <label style={{
                      background: doc ? '#F7F8FA' : '#1B2A4A', color: doc ? '#1B2A4A' : 'white',
                      border: doc ? '1px solid #E8ECF0' : 'none',
                      padding: '6px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600,
                    }}>
                      {doc ? 'Replace' : 'Upload'}
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleUpload(dt.value, file)
                          e.target.value = ''
                        }}
                      />
                    </label>
                  )}
                  {doc && (
                    <button onClick={() => handleDelete(doc.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 16, padding: '4px' }}>
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 24, padding: '16px 20px', background: '#F7F8FA', borderRadius: 8, border: '1px solid #E8ECF0' }}>
        <p style={{ fontSize: 13, color: '#4A5568', margin: 0 }}>
          📋 <strong>Accepted formats:</strong> PDF, JPEG, PNG, WEBP · Max 20 MB per file · Documents are verified using AI within seconds · Raw files are never shared with agents or landlords — only via time-limited secure links.
        </p>
      </div>
    </div>
  )
}

function StatusBadge({ status, confidence }: { status: string; confidence: number | null }) {
  const config: Record<string, { label: string; color: string; bg: string }> = {
    VERIFIED: { label: '✓ Verified', color: '#1A7A4A', bg: '#DCFCE7' },
    PENDING: { label: '⏳ Verifying', color: '#B45309', bg: '#FEF3C7' },
    REJECTED: { label: '✗ Rejected', color: '#C41A1A', bg: '#FEE2E2' },
    EXPIRED: { label: '⚠ Expired', color: '#6B7280', bg: '#F3F4F6' },
    EXPIRING_SOON: { label: '⏳ Expiring', color: '#B45309', bg: '#FEF3C7' },
  }
  const c = config[status] ?? config.PENDING

  return (
    <span style={{
      background: c.bg, color: c.color, fontSize: 11, fontWeight: 600,
      padding: '3px 10px', borderRadius: 4, whiteSpace: 'nowrap',
    }}>
      {c.label}
      {confidence !== null && status === 'VERIFIED' && (
        <span style={{ opacity: 0.7, marginLeft: 4 }}>{Math.round(confidence * 100)}%</span>
      )}
    </span>
  )
}
