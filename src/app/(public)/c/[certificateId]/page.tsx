import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCertificateData } from '@/services/certificates'
import { prisma } from '@/lib/prisma/client'
import { CertificatePublicView } from '@/components/certificate/CertificatePublicView'

type Props = { params: Promise<{ certificateId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { certificateId } = await params
  const cert = await prisma.certificate.findUnique({
    where: { id: certificateId },
    include: { tenant: { select: { fullName: true, trustScore: true } } },
  })

  if (!cert || cert.isRevoked) {
    return { title: 'Certificate | SwissTrust' }
  }

  return {
    title: `${cert.tenant.fullName} — Verified Tenant | SwissTrust`,
    description: `SwissTrust verified rental dossier for ${cert.propertyAddress}`,
    robots: 'noindex', // Private data — do not index
  }
}

export default async function CertificatePage({ params }: Props) {
  const { certificateId } = await params

  // Get current user if logged in
  const supabase = await createSupabaseServerClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  let viewer: {
    userId?: string
    role?: string
    regieId?: string
    isVerified?: boolean
  } = {}

  if (authUser) {
    const dbUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: {
        agentProfile: true,
        landlordProfile: true,
      },
    })
    if (dbUser) {
      viewer = {
        userId: dbUser.id,
        role: dbUser.role,
        regieId: dbUser.agentProfile?.regieId,
        isVerified: dbUser.agentProfile?.isVerified ?? dbUser.landlordProfile?.verificationStatus === 'VERIFIED',
      }
    }
  }

  const result = await getCertificateData(certificateId, viewer)

  return (
    <CertificatePublicView
      result={result}
      certificateId={certificateId}
      isLoggedIn={!!authUser}
      viewerRole={viewer.role}
    />
  )
}
