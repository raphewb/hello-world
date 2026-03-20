'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Role = 'TENANT' | 'AGENT' | 'LANDLORD'

export default function RegisterPage() {
  const router = useRouter()
  const [role, setRole] = useState<Role | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!role) return

    setLoading(true)
    setError(null)

    const body: Record<string, unknown> = { role, email, password }
    if (role === 'TENANT') body.fullName = fullName
    else { body.firstName = firstName; body.lastName = lastName }

    const res = await fetch('/api/auth/register', {
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

    // Auto-login after registration
    const loginRes = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const loginData = await loginRes.json()

    if (loginData.success) {
      router.push(loginData.data.redirectTo)
    } else {
      router.push('/auth/login')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'white', border: '1px solid #E8ECF0', borderRadius: 12, padding: '40px 36px', width: '100%', maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ fontFamily: 'DM Serif Display, serif', color: '#1B2A4A', fontSize: 22, fontWeight: 700 }}>
              Swiss<span style={{ color: '#D4001A' }}>Trust</span>
            </div>
          </Link>
          <h1 style={{ color: '#1B2A4A', fontSize: 22, fontFamily: 'DM Serif Display, serif', marginTop: 24, marginBottom: 4 }}>
            Create your account
          </h1>
        </div>

        {/* Role selection */}
        {!role ? (
          <div>
            <p style={{ color: '#4A5568', fontSize: 14, textAlign: 'center', marginBottom: 24 }}>I am a…</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { id: 'TENANT', icon: '🏠', label: 'Tenant', desc: 'Build and share my rental dossier' },
                { id: 'AGENT', icon: '🏢', label: 'Real estate agent / régie', desc: 'Receive and review tenant dossiers' },
                { id: 'LANDLORD', icon: '🔑', label: 'Private landlord', desc: 'Rent out my property directly' },
              ].map((r) => (
                <button key={r.id} onClick={() => setRole(r.id as Role)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
                    border: '1px solid #E8ECF0', borderRadius: 8, background: 'white',
                    cursor: 'pointer', textAlign: 'left',
                  }}>
                  <span style={{ fontSize: 24 }}>{r.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, color: '#1B2A4A' }}>{r.label}</div>
                    <div style={{ fontSize: 12, color: '#4A5568' }}>{r.desc}</div>
                  </div>
                  <span style={{ marginLeft: 'auto', color: '#9CA3AF' }}>→</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <button type="button" onClick={() => setRole(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4A5568', fontSize: 13, marginBottom: 20, padding: 0 }}>
              ← Change role
            </button>

            {error && (
              <div style={{ background: '#FEE2E2', border: '1px solid #C41A1A', borderRadius: 6, padding: '10px 14px', marginBottom: 16, color: '#C41A1A', fontSize: 14 }}>
                {error}
              </div>
            )}

            {role === 'TENANT' ? (
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Full name</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required style={inputStyle} placeholder="Marie Dupont" />
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>First name</label>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Last name</label>
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required style={inputStyle} />
                </div>
              </div>
            )}

            {role === 'AGENT' && (
              <div style={{ background: '#F7F8FA', border: '1px solid #E8ECF0', borderRadius: 6, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: '#4A5568' }}>
                ℹ️ You'll link to your agency after registration, or create a new company account.
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Password (min 8 characters)</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} style={inputStyle} />
            </div>

            <button type="submit" disabled={loading} style={{ ...btnStyle, width: '100%', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Creating account…' : 'Create account →'}
            </button>

            <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
              By registering you agree to our Terms of Service and Privacy Policy. Your data is stored in Switzerland and protected under nFADP.
            </p>
          </form>
        )}

        <p style={{ textAlign: 'center', fontSize: 13, color: '#4A5568', marginTop: 20 }}>
          Already have an account?{' '}
          <Link href="/auth/login" style={{ color: '#1B2A4A', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1px solid #E8ECF0',
  borderRadius: 6, fontSize: 14, color: '#1B2A4A', background: 'white',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontWeight: 600, color: '#1B2A4A', marginBottom: 6, fontSize: 13,
}

const btnStyle: React.CSSProperties = {
  background: '#1B2A4A', color: 'white', border: 'none',
  padding: '12px 24px', borderRadius: 6, fontSize: 14, cursor: 'pointer', fontWeight: 600,
}
