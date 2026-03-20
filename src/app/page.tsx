import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SwissTrust — Verified Tenant Identity for the Swiss Rental Market',
  description: 'Build your verified dossier once. Share it securely with any landlord or agency in Switzerland using a QR certificate.',
}

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA' }}>
      {/* Nav */}
      <nav style={{ background: '#1B2A4A', padding: '0 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'DM Serif Display, serif', color: 'white', fontSize: 20, fontWeight: 700 }}>
            Swiss<span style={{ color: '#D4001A' }}>Trust</span>
          </div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <Link href="/how-it-works" style={{ color: '#94A3B8', fontSize: 14, textDecoration: 'none' }}>How it works</Link>
            <Link href="/pricing" style={{ color: '#94A3B8', fontSize: 14, textDecoration: 'none' }}>Pricing</Link>
            <Link href="/auth/login" style={{ color: 'white', fontSize: 14, textDecoration: 'none' }}>Sign in</Link>
            <Link href="/auth/register" style={{
              background: '#D4001A', color: 'white', padding: '8px 20px',
              borderRadius: 6, fontSize: 14, textDecoration: 'none', fontWeight: 600,
            }}>
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ background: '#1B2A4A', padding: '80px 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', background: '#D4001A', color: 'white', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20, marginBottom: 20, letterSpacing: 1 }}>
            SWISS RENTAL MARKET
          </div>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', color: 'white', fontSize: 48, lineHeight: 1.2, margin: '0 0 20px' }}>
            Verify once.<br />Apply anywhere.
          </h1>
          <p style={{ color: '#94A3B8', fontSize: 18, lineHeight: 1.6, maxWidth: 560, margin: '0 auto 40px' }}>
            Build your verified rental dossier once and share it with landlords and agencies across Switzerland — securely, without exposing your raw documents to strangers.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/auth/register" style={{
              background: '#D4001A', color: 'white', padding: '14px 32px',
              borderRadius: 6, fontSize: 16, textDecoration: 'none', fontWeight: 600,
            }}>
              Build my dossier →
            </Link>
            <Link href="/how-it-works" style={{
              background: 'rgba(255,255,255,0.1)', color: 'white', padding: '14px 32px',
              borderRadius: 6, fontSize: 16, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.2)',
            }}>
              How it works
            </Link>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ background: 'white', borderBottom: '1px solid #E8ECF0' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', textAlign: 'center', gap: 24 }}>
          {[
            { stat: '50–100+', label: 'Applicants per listing in Geneva' },
            { stat: '270', label: 'Identity theft cases via fake listings (NCSC 2024)' },
            { stat: '90 days', label: 'Certificate validity — one dossier, infinite applications' },
          ].map((s) => (
            <div key={s.stat}>
              <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 28, color: '#D4001A', fontWeight: 700 }}>{s.stat}</div>
              <div style={{ fontSize: 13, color: '#4A5568', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '80px 24px' }}>
        <h2 style={{ fontFamily: 'DM Serif Display, serif', color: '#1B2A4A', fontSize: 32, textAlign: 'center', marginBottom: 48 }}>
          Your dossier. Your control.
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
          {[
            { step: '1', icon: '📄', title: 'Verify once', desc: 'Upload your documents. Our AI verifies them in seconds — passport, Betreibungsauszug, salary slips, insurance.' },
            { step: '2', icon: '🔑', title: 'Generate a QR certificate', desc: 'Create a property-specific certificate in 3 steps. Choose exactly who can see what — full control over your data.' },
            { step: '3', icon: '✓', title: 'Apply with confidence', desc: 'Share your QR code or link. Landlords see only what you allow. Full audit trail. Revoke access at any time.' },
          ].map((item) => (
            <div key={item.step} style={{ background: 'white', border: '1px solid #E8ECF0', borderRadius: 8, padding: '28px 24px' }}>
              <div style={{ fontSize: 32, marginBottom: 16 }}>{item.icon}</div>
              <h3 style={{ fontFamily: 'DM Serif Display, serif', color: '#1B2A4A', marginBottom: 8, fontSize: 18 }}>
                <span style={{ color: '#D4001A' }}>{item.step}. </span>{item.title}
              </h3>
              <p style={{ color: '#4A5568', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* For agents section */}
      <div style={{ background: '#1B2A4A', padding: '80px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
          <div>
            <div style={{ color: '#D4001A', fontSize: 12, fontWeight: 600, letterSpacing: 1, marginBottom: 12 }}>FOR AGENCIES & LANDLORDS</div>
            <h2 style={{ fontFamily: 'DM Serif Display, serif', color: 'white', fontSize: 28, marginBottom: 16 }}>
              Pre-screened applicants, verified instantly
            </h2>
            <p style={{ color: '#94A3B8', lineHeight: 1.6, marginBottom: 24 }}>
              Stop processing stacks of unverified documents. SwissTrust tenants have already completed identity checks. View their full dossier in seconds, sorted by trust score.
            </p>
            <Link href="/auth/register" style={{
              background: '#D4001A', color: 'white', padding: '12px 24px',
              borderRadius: 6, fontSize: 14, textDecoration: 'none', fontWeight: 600,
            }}>
              Register your agency →
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              '✓ Instant verified dossier access',
              '✓ Trust Score (A/B/C) at a glance',
              '✓ Document freshness indicators',
              '✓ nFADP-compliant audit trail',
              '✓ Ghost delivery — receive dossiers before registering',
            ].map((f) => (
              <div key={f} style={{ color: '#E2E8F0', fontSize: 14, display: 'flex', gap: 8 }}>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '80px 24px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'DM Serif Display, serif', color: '#1B2A4A', fontSize: 28, marginBottom: 16 }}>
          Ready to apply smarter?
        </h2>
        <p style={{ color: '#4A5568', marginBottom: 32 }}>Join tenants across Switzerland who've simplified their rental applications.</p>
        <Link href="/auth/register" style={{
          background: '#1B2A4A', color: 'white', padding: '14px 40px',
          borderRadius: 6, fontSize: 16, textDecoration: 'none', fontWeight: 600,
        }}>
          Get started free →
        </Link>
      </div>

      {/* Footer */}
      <div style={{ background: '#1B2A4A', padding: '24px', textAlign: 'center' }}>
        <p style={{ color: '#4A5568', fontSize: 12, margin: 0 }}>
          © 2026 SwissTrust · nFADP compliant · Made in Switzerland ·{' '}
          <Link href="/security" style={{ color: '#6B7280', textDecoration: 'none' }}>Privacy & Security</Link>
        </p>
      </div>
    </div>
  )
}
