import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SwissTrust — Verified Tenant Identity',
  description: 'Build your verified rental dossier once. Apply anywhere in Switzerland with a secure QR certificate.',
  keywords: ['Swiss rental', 'tenant verification', 'dossier locataire', 'Betreibungsauszug', 'SwissTrust'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=DM+Serif+Display&family=JetBrains+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  )
}
