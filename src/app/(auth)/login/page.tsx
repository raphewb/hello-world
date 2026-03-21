'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const redirectTo = params.get('redirectTo') ?? null

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()

    if (!data.success) {
      setError(data.error)
      setLoading(false)
      return
    }

    router.push(redirectTo ?? data.data.redirectTo)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'white', border: '1px solid #E8ECF0', borderRadius: 12, padding: '40px 36px', width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ fontFamily: 'DM Serif Display, serif', color: '#1B2A4A', fontSize: 22, fontWeight: 700 }}>
              Swiss<span style={{ color: '#D4001A' }}>Trust</span>
            </div>
          </Link>
          <h1 style={{ color: '#1B2A4A', fontSize: 22, fontFamily: 'DM Serif Display, serif', marginTop: 24, marginBottom: 4 }}>
            Welcome back
          </h1>
          <p style={{ color: '#4A5568', fontSize: 14 }}>Sign in to your account</p>
        </div>

        {error && (
          <div style={{ background: '#FEE2E2', border: '1px solid #C41A1A', borderRadius: 6, padding: '10px 14px', marginBottom: 20, color: '#C41A1A', fontSize: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 600, color: '#1B2A4A', marginBottom: 6, fontSize: 13 }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              style={inputStyle} placeholder="you@example.com" />
          </div>
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontWeight: 600, color: '#1B2A4A', fontSize: 13 }}>Password</label>
              <Link href="/auth/forgot-password" style={{ fontSize: 12, color: '#4A5568' }}>Forgot?</Link>
            </div>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              style={inputStyle} placeholder="••••••••" />
          </div>

          <button type="submit" disabled={loading} style={{ ...btnStyle, width: '100%', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#4A5568', marginTop: 20 }}>
          No account?{' '}
          <Link href="/auth/register" style={{ color: '#1B2A4A', fontWeight: 600 }}>Register</Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
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
