'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatCHF } from '@/lib/utils'

type RegieResult = {
  id: string
  name: string
  slug: string
  address: string
  canton: string
  hasAccount: boolean
  isVerified: boolean
}

type Step = 1 | 2 | 3

export default function NewCertificatePage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1
  const [address, setAddress] = useState('')
  const [rent, setRent] = useState('')

  // Step 2
  const [mode, setMode] = useState<'DIRECTED' | 'OPEN' | 'ON_REQUEST'>('ON_REQUEST')
  const [regieSearch, setRegieSearch] = useState('')
  const [regieResults, setRegieResults] = useState<RegieResult[]>([])
  const [selectedRegie, setSelectedRegie] = useState<RegieResult | null>(null)
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [autoApproveHours, setAutoApproveHours] = useState<number>(24)
  const [openConsent, setOpenConsent] = useState(false)

  // Step 3
  const [generatedCertId, setGeneratedCertId] = useState<string | null>(null)

  async function searchRegies(q: string) {
    if (q.length < 2) { setRegieResults([]); return }
    const res = await fetch(`/api/regie/directory?q=${encodeURIComponent(q)}`)
    const data = await res.json()
    if (data.success) setRegieResults(data.data)
  }

  async function handleGenerate() {
    setLoading(true)
    setError(null)

    const body: Record<string, unknown> = {
      propertyAddress: address,
      monthlyRentChf: parseInt(rent),
      sharingMode: mode,
      autoApproveHours: mode === 'ON_REQUEST' ? autoApproveHours : 24,
    }

    if (mode === 'DIRECTED') {
      if (selectedRegie) {
        body.directedRegieId = selectedRegie.id
      } else if (ownerEmail) {
        body.directedOwnerEmail = ownerEmail
        body.directedOwnerName = ownerName
      }
    }

    const res = await fetch('/api/tenant/certificates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()

    if (!data.success) {
      setError(data.error)
      setLoading(false)
      return
    }

    setGeneratedCertId(data.data.id)
    setStep(3)
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 24px' }}>
      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
        {[1, 2, 3].map((s) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: step >= s ? '#1B2A4A' : '#E8ECF0',
              color: step >= s ? 'white' : '#9CA3AF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 13,
            }}>
              {step > s ? '✓' : s}
            </div>
            {s < 3 && <div style={{ width: 40, height: 2, background: step > s ? '#1B2A4A' : '#E8ECF0' }} />}
          </div>
        ))}
        <span style={{ fontSize: 13, color: '#4A5568', marginLeft: 8 }}>
          {step === 1 ? 'Property' : step === 2 ? 'Sharing mode' : 'Your certificate'}
        </span>
      </div>

      <h1 style={{ fontFamily: 'DM Serif Display, serif', color: '#1B2A4A', fontSize: 26, marginBottom: 24 }}>
        {step === 1 ? 'Which property are you applying for?' :
         step === 2 ? 'How do you want to share your dossier?' :
         'Your certificate is ready'}
      </h1>

      {error && (
        <div style={{ background: '#FEE2E2', border: '1px solid #C41A1A', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#C41A1A', fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Step 1 — Property */}
      {step === 1 && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontWeight: 600, color: '#1B2A4A', marginBottom: 6, fontSize: 14 }}>
              Property address
            </label>
            <input
              type="text"
              placeholder="e.g. Rue de Rive 12, 1204 Genève"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontWeight: 600, color: '#1B2A4A', marginBottom: 6, fontSize: 14 }}>
              Monthly rent (CHF)
            </label>
            <input
              type="number"
              placeholder="e.g. 2500"
              value={rent}
              onChange={(e) => setRent(e.target.value)}
              style={inputStyle}
            />
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!address || !rent || parseInt(rent) <= 0}
            style={{ ...btnStyle, opacity: (!address || !rent) ? 0.5 : 1 }}
          >
            Next: Choose sharing mode →
          </button>
        </div>
      )}

      {/* Step 2 — Sharing mode */}
      {step === 2 && (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {[
              {
                id: 'ON_REQUEST',
                label: 'On Request (Recommended)',
                desc: 'Public summary visible to all. Verified professionals can request full access — you approve or deny each request.',
                icon: '🔐',
              },
              {
                id: 'DIRECTED',
                label: 'Directed',
                desc: 'Pre-authorise a specific agency or private owner. They get instant access when they scan — no approval needed.',
                icon: '🎯',
              },
              {
                id: 'OPEN',
                label: 'Open',
                desc: 'Any verified property professional on SwissTrust can view your full dossier. Maximum reach, less control.',
                icon: '🌐',
              },
            ].map((m) => (
              <div
                key={m.id}
                onClick={() => setMode(m.id as typeof mode)}
                style={{
                  border: `2px solid ${mode === m.id ? '#1B2A4A' : '#E8ECF0'}`,
                  borderRadius: 8, padding: '16px 20px', cursor: 'pointer',
                  background: mode === m.id ? '#F7F8FA' : 'white',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{m.icon}</span>
                  <div style={{ fontWeight: 600, color: '#1B2A4A' }}>{m.label}</div>
                  {mode === m.id && <span style={{ marginLeft: 'auto', color: '#1B2A4A' }}>●</span>}
                </div>
                <p style={{ fontSize: 13, color: '#4A5568', margin: '8px 0 0 30px', lineHeight: 1.5 }}>{m.desc}</p>
              </div>
            ))}
          </div>

          {/* DIRECTED options */}
          {mode === 'DIRECTED' && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 600, color: '#1B2A4A', marginBottom: 6, fontSize: 14 }}>
                Search for agency (régie)
              </label>
              <input
                type="text"
                placeholder="e.g. Naef, Pilet, Zimmermann…"
                value={regieSearch}
                onChange={(e) => {
                  setRegieSearch(e.target.value)
                  searchRegies(e.target.value)
                  setSelectedRegie(null)
                }}
                style={inputStyle}
              />
              {regieResults.length > 0 && !selectedRegie && (
                <div style={{ border: '1px solid #E8ECF0', borderRadius: 6, marginTop: 4, overflow: 'hidden' }}>
                  {regieResults.map((r) => (
                    <div key={r.id}
                      onClick={() => { setSelectedRegie(r); setRegieSearch(r.name); setRegieResults([]) }}
                      style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #F7F8FA' }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#1B2A4A' }}>
                        {r.name}
                        {r.isVerified && <span style={{ marginLeft: 6, fontSize: 11, color: '#1A7A4A' }}>✓ Verified</span>}
                        {!r.hasAccount && <span style={{ marginLeft: 6, fontSize: 11, color: '#B45309' }}>Not yet on SwissTrust</span>}
                      </div>
                      <div style={{ fontSize: 12, color: '#4A5568' }}>{r.address}</div>
                    </div>
                  ))}
                </div>
              )}

              {selectedRegie && !selectedRegie.hasAccount && (
                <div style={{ background: '#FEF3C7', border: '1px solid #B45309', borderRadius: 6, padding: '10px 14px', marginTop: 8, fontSize: 13 }}>
                  ⚠️ <strong>{selectedRegie.name}</strong> doesn't have a SwissTrust account yet. We'll send them an invitation and notify you when they join.
                </div>
              )}

              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 13, color: '#4A5568', marginBottom: 8 }}>Or direct to a private owner:</div>
                <input type="text" placeholder="Owner name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
                <input type="email" placeholder="Owner email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} style={inputStyle} />
              </div>
            </div>
          )}

          {/* OPEN consent */}
          {mode === 'OPEN' && (
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 20, cursor: 'pointer' }}>
              <input type="checkbox" checked={openConsent} onChange={(e) => setOpenConsent(e.target.checked)} style={{ marginTop: 2 }} />
              <span style={{ fontSize: 13, color: '#4A5568', lineHeight: 1.5 }}>
                I understand that any verified property professional on SwissTrust can view my full dossier using this certificate.
              </span>
            </label>
          )}

          {/* ON_REQUEST auto-approve */}
          {mode === 'ON_REQUEST' && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 600, color: '#1B2A4A', marginBottom: 6, fontSize: 14 }}>
                Auto-approve after
              </label>
              <select value={autoApproveHours} onChange={(e) => setAutoApproveHours(parseInt(e.target.value))} style={inputStyle}>
                <option value={12}>12 hours</option>
                <option value={24}>24 hours (default)</option>
                <option value={48}>48 hours</option>
                <option value={0}>Never (manual only)</option>
              </select>
              <p style={{ fontSize: 12, color: '#4A5568', marginTop: 4 }}>
                If you don't respond to an access request, it will be automatically approved after this time.
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep(1)} style={{ ...btnStyle, background: '#F7F8FA', color: '#1B2A4A', border: '1px solid #E8ECF0' }}>
              ← Back
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading || (mode === 'OPEN' && !openConsent)}
              style={{ ...btnStyle, opacity: (loading || (mode === 'OPEN' && !openConsent)) ? 0.5 : 1, flex: 1 }}
            >
              {loading ? 'Generating…' : 'Generate certificate →'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Success */}
      {step === 3 && generatedCertId && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', color: '#1B2A4A', marginBottom: 12 }}>Certificate created!</h2>
          <p style={{ color: '#4A5568', marginBottom: 24 }}>
            Your QR code is ready. Share the link or download the PDF.
          </p>

          <div style={{ background: '#F7F8FA', borderRadius: 8, padding: 20, marginBottom: 20 }}>
            <div style={{ fontWeight: 600, color: '#1B2A4A', marginBottom: 8, fontSize: 13 }}>Share link</div>
            <code style={{ fontSize: 12, color: '#4A5568', wordBreak: 'break-all' }}>
              {window.location.origin}/c/{generatedCertId}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/c/${generatedCertId}`)}
              style={{ display: 'block', margin: '12px auto 0', ...btnSmallStyle }}
            >
              Copy link
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <a href={`/c/${generatedCertId}`} target="_blank"
              style={{ ...btnStyle, textDecoration: 'none', display: 'inline-block' }}>
              Preview certificate →
            </a>
            <a href={`/app/tenant/certificates/${generatedCertId}`}
              style={{ ...btnStyle, background: '#F7F8FA', color: '#1B2A4A', border: '1px solid #E8ECF0', textDecoration: 'none', display: 'inline-block' }}>
              Manage
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1px solid #E8ECF0',
  borderRadius: 6, fontSize: 14, color: '#1B2A4A', background: 'white',
  boxSizing: 'border-box',
}

const btnStyle: React.CSSProperties = {
  background: '#1B2A4A', color: 'white', border: 'none',
  padding: '12px 24px', borderRadius: 6, fontSize: 14, cursor: 'pointer', fontWeight: 600,
}

const btnSmallStyle: React.CSSProperties = {
  background: '#1B2A4A', color: 'white', border: 'none',
  padding: '8px 16px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600,
}
