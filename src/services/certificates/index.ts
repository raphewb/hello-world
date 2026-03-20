/**
 * Certificate service — generation, QR, access control
 */

import QRCode from 'qrcode'
import { prisma } from '@/lib/prisma/client'
import { createSupabaseServiceClient } from '@/lib/supabase/server'
import { getSignedDocumentUrl, getSignedQrUrl, BUCKETS } from '@/lib/supabase/storage'
import { computeRentEligibilityRange, qualifiesForRent, getAvatarInitials, generateCertificateExpiry } from '@/lib/utils'
import type { CertificatePublicSummary, CertificateFullDossier, DocumentWithSignedUrl } from '@/types'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://swisstrust.ch'

// ─── Certificate Generation ──────────────────────────────────────────────────

type CreateCertificateInput = {
  tenantId: string
  propertyAddress: string
  monthlyRentChf: number
  sharingMode: 'DIRECTED' | 'OPEN' | 'ON_REQUEST'
  directedRegieId?: string
  directedAgentId?: string
  directedOwnerEmail?: string
  directedOwnerName?: string
  autoApproveHours?: number
  notes?: string
}

export async function createCertificate(input: CreateCertificateInput) {
  const expiresAt = generateCertificateExpiry(90)

  const certificate = await prisma.certificate.create({
    data: {
      tenantId: input.tenantId,
      propertyAddress: input.propertyAddress,
      monthlyRentChf: input.monthlyRentChf,
      sharingMode: input.sharingMode,
      directedRegieId: input.directedRegieId ?? null,
      directedAgentId: input.directedAgentId ?? null,
      directedOwnerEmail: input.directedOwnerEmail ?? null,
      directedOwnerName: input.directedOwnerName ?? null,
      autoApproveHours: input.autoApproveHours ?? 24,
      notes: input.notes ?? null,
      expiresAt,
    },
  })

  // Generate QR code asynchronously
  await generateAndStoreQR(certificate.id)

  // Handle ghost delivery for DIRECTED → régie without account
  if (input.sharingMode === 'DIRECTED' && input.directedRegieId) {
    const regie = await prisma.regie.findUnique({
      where: { id: input.directedRegieId },
    })
    if (regie && !regie.hasAccount) {
      await handleGhostDelivery(certificate.id, input.directedRegieId, input.tenantId, regie)
    }
  }

  return certificate
}

async function generateAndStoreQR(certificateId: string): Promise<string> {
  const url = `${APP_URL}/c/${certificateId}`
  const qrBuffer = await QRCode.toBuffer(url, {
    type: 'png',
    width: 400,
    margin: 2,
    color: { dark: '#1B2A4A', light: '#FFFFFF' },
  })

  const supabase = createSupabaseServiceClient()
  const storagePath = `${certificateId}/qr.png`

  await supabase.storage
    .from(BUCKETS.QR_CODES)
    .upload(storagePath, qrBuffer, { contentType: 'image/png', upsert: true })

  await prisma.certificate.update({
    where: { id: certificateId },
    data: { qrCodeUrl: storagePath },
  })

  return storagePath
}

async function handleGhostDelivery(
  certificateId: string,
  regieId: string,
  tenantId: string,
  regie: { name: string; email: string | null; ghostDeliveryCount: number }
) {
  // Upsert ghost delivery record
  const existing = await prisma.ghostDelivery.findUnique({
    where: { certificateId },
  })

  if (!existing) {
    await prisma.ghostDelivery.create({
      data: { certificateId, regieId, tenantId },
    })
  }

  // Increment régie ghost count
  const newCount = regie.ghostDeliveryCount + 1
  await prisma.regie.update({
    where: { id: regieId },
    data: { ghostDeliveryCount: newCount },
  })

  // Send invitation email at thresholds
  if (regie.email && (newCount === 1 || newCount === 10 || newCount === 25)) {
    const { sendRegieInvitation } = await import('@/lib/email')
    const registerUrl = `${APP_URL}/auth/register?regieId=${regieId}&ref=ghost`
    await sendRegieInvitation(regie.email, regie.name, newCount, registerUrl)

    // Mark as sent for the first certificate
    if (newCount === 1) {
      await prisma.ghostDelivery.update({
        where: { certificateId },
        data: { invitationSent: true, invitationSentAt: new Date() },
      })
    }
  }
}

// ─── Certificate Data Access ─────────────────────────────────────────────────

type ViewerContext = {
  userId?: string
  role?: string
  regieId?: string
  isVerified?: boolean
}

export async function getCertificateData(
  certificateId: string,
  viewer: ViewerContext
): Promise<
  | { tier: 'public'; data: CertificatePublicSummary }
  | { tier: 'full'; data: CertificateFullDossier }
  | { tier: 'request'; data: CertificatePublicSummary; accessId: string | null }
  | { tier: 'expired' }
  | { tier: 'revoked' }
> {
  const cert = await prisma.certificate.findUnique({
    where: { id: certificateId },
    include: {
      tenant: {
        include: {
          documents: { where: { isCurrent: true } },
        },
      },
      directedRegie: true,
      directedAgent: true,
    },
  })

  if (!cert) return { tier: 'expired' }
  if (cert.isRevoked) return { tier: 'revoked' }
  if (cert.expiresAt < new Date()) return { tier: 'expired' }

  const publicSummary = buildPublicSummary(cert)

  // Determine access tier
  const isAuthorised = await checkAuthorisation(cert, viewer)

  if (isAuthorised) {
    // Log full dossier access
    await logAccess(cert.id, viewer, 'FULL_DOSSIER_VIEWED')
    await prisma.certificate.update({ where: { id: cert.id }, data: { accessCount: { increment: 1 } } })

    const fullDossier = await buildFullDossier(cert, publicSummary)
    return { tier: 'full', data: fullDossier }
  }

  // Log public summary access
  await logAccess(cert.id, viewer, 'PUBLIC_SUMMARY')

  if (cert.sharingMode === 'ON_REQUEST' && viewer.userId && viewer.role !== 'TENANT') {
    // Check for existing access request
    const existingRequest = await prisma.certificateAccess.findFirst({
      where: {
        certificateId: cert.id,
        viewerUserId: viewer.userId,
        accessType: 'ACCESS_REQUESTED',
      },
    })
    return {
      tier: 'request',
      data: publicSummary,
      accessId: existingRequest?.id ?? null,
    }
  }

  return { tier: 'public', data: publicSummary }
}

async function checkAuthorisation(
  cert: {
    sharingMode: string
    directedRegieId: string | null
    directedAgentId: string | null
    directedOwnerEmail: string | null
    tenantId: string
  },
  viewer: ViewerContext
): Promise<boolean> {
  if (!viewer.userId) return false

  // Tenant always sees their own
  const profile = await prisma.tenantProfile.findFirst({
    where: { userId: viewer.userId },
  })
  if (profile?.id === cert.tenantId) return true

  switch (cert.sharingMode) {
    case 'DIRECTED': {
      if (cert.directedAgentId) {
        const agentProfile = await prisma.agentProfile.findFirst({
          where: { userId: viewer.userId },
        })
        return agentProfile?.id === cert.directedAgentId
      }
      if (cert.directedRegieId) {
        const agentProfile = await prisma.agentProfile.findFirst({
          where: { userId: viewer.userId },
        })
        return agentProfile?.regieId === cert.directedRegieId
      }
      // Private owner invitation — check email
      const user = await prisma.user.findUnique({ where: { id: viewer.userId } })
      return user?.email === cert.directedOwnerEmail
    }

    case 'OPEN': {
      if (!viewer.isVerified) return false
      return viewer.role === 'AGENT' || viewer.role === 'LANDLORD'
    }

    case 'ON_REQUEST': {
      // Check if access was approved
      const approved = await prisma.certificateAccess.findFirst({
        where: {
          certificateId: (cert as unknown as { id: string }).id,
          viewerUserId: viewer.userId,
          accessType: { in: ['ACCESS_APPROVED', 'ACCESS_AUTO_APPROVED'] },
        },
      })
      return !!approved
    }

    default:
      return false
  }
}

function buildPublicSummary(cert: {
  id: string
  propertyAddress: string
  monthlyRentChf: number
  sharingMode: string
  expiresAt: Date
  isRevoked: boolean
  createdAt: Date
  tenant: {
    fullName: string
    trustScore: string
    verificationStatus: string
    profileCompleteness: number
    occupantCount: number
    isSmoker: boolean
    hasPets: boolean
    petDetails: string | null
    monthlyIncomeChf: number | null
    documents: Array<{ verificationStatus: string; isCurrent: boolean }>
  }
}): CertificatePublicSummary {
  const tenant = cert.tenant
  const eligibility = tenant.monthlyIncomeChf
    ? computeRentEligibilityRange(tenant.monthlyIncomeChf)
    : { min: 0, max: 0 }

  const verifiedDocs = tenant.documents.filter(
    (d) => d.verificationStatus === 'VERIFIED' || d.verificationStatus === 'EXPIRING_SOON'
  )

  return {
    id: cert.id,
    tenantName: tenant.fullName,
    avatarInitials: getAvatarInitials(tenant.fullName),
    trustScore: tenant.trustScore as CertificatePublicSummary['trustScore'],
    verificationStatus: tenant.verificationStatus as CertificatePublicSummary['verificationStatus'],
    profileCompleteness: tenant.profileCompleteness,
    occupantCount: tenant.occupantCount,
    isSmoker: tenant.isSmoker,
    hasPets: tenant.hasPets,
    petDetails: tenant.petDetails,
    rentEligibilityMin: eligibility.min,
    rentEligibilityMax: eligibility.max,
    qualifiesForRent: qualifiesForRent(tenant.monthlyIncomeChf, cert.monthlyRentChf),
    monthlyRentChf: cert.monthlyRentChf,
    propertyAddress: cert.propertyAddress,
    documentsVerifiedCount: verifiedDocs.length,
    documentsTotalCount: tenant.documents.length,
    sharingMode: cert.sharingMode as CertificatePublicSummary['sharingMode'],
    expiresAt: cert.expiresAt.toISOString(),
    isRevoked: cert.isRevoked,
    createdAt: cert.createdAt.toISOString(),
  }
}

async function buildFullDossier(
  cert: {
    tenant: {
      fullName: string
      nationality: string | null
      residencePermitType: string
      employmentType: string
      employerName: string | null
      currentAddress: string | null
      dateOfBirth: Date | null
      occupantDetails: unknown
      documents: Array<{
        id: string
        type: string
        fileName: string
        verificationStatus: string
        aiConfidenceScore: number | null
        validFrom: Date | null
        expiresAt: Date | null
        uploadedAt: Date
        fileUrl: string
        aiExtractedData: unknown
      }>
    }
  },
  publicSummary: CertificatePublicSummary
): Promise<CertificateFullDossier> {
  const docsWithUrls: DocumentWithSignedUrl[] = await Promise.all(
    cert.tenant.documents.map(async (doc) => ({
      id: doc.id,
      type: doc.type as DocumentWithSignedUrl['type'],
      fileName: doc.fileName,
      verificationStatus: doc.verificationStatus as DocumentWithSignedUrl['verificationStatus'],
      aiConfidenceScore: doc.aiConfidenceScore,
      validFrom: doc.validFrom?.toISOString().split('T')[0] ?? null,
      expiresAt: doc.expiresAt?.toISOString().split('T')[0] ?? null,
      uploadedAt: doc.uploadedAt.toISOString(),
      signedUrl: await getSignedDocumentUrl(doc.fileUrl),
      aiExtractedData: doc.aiExtractedData as Record<string, unknown> | null,
    }))
  )

  const tenant = cert.tenant
  return {
    ...publicSummary,
    nationality: tenant.nationality,
    residencePermitType: tenant.residencePermitType as CertificateFullDossier['residencePermitType'],
    employmentType: tenant.employmentType as CertificateFullDossier['employmentType'],
    employerName: tenant.employerName,
    currentAddress: tenant.currentAddress,
    dateOfBirth: tenant.dateOfBirth?.toISOString().split('T')[0] ?? null,
    occupantDetails: (tenant.occupantDetails as Array<{ name: string; relation: string; age: number }>) ?? [],
    documents: docsWithUrls,
  }
}

async function logAccess(
  certificateId: string,
  viewer: ViewerContext,
  accessType: 'PUBLIC_SUMMARY' | 'FULL_DOSSIER_VIEWED'
) {
  const viewerType = viewer.role === 'AGENT'
    ? 'AGENT'
    : viewer.role === 'LANDLORD'
    ? 'LANDLORD'
    : viewer.userId
    ? 'UNREGISTERED'
    : 'PUBLIC'

  await prisma.certificateAccess.create({
    data: {
      certificateId,
      viewerUserId: viewer.userId ?? null,
      viewerType: viewerType as 'AGENT' | 'LANDLORD' | 'UNREGISTERED' | 'PUBLIC',
      accessType,
    },
  })
}

export async function requestCertificateAccess(
  certificateId: string,
  viewer: ViewerContext
): Promise<{ accessId: string }> {
  const cert = await prisma.certificate.findUnique({ where: { id: certificateId } })
  if (!cert || cert.isRevoked || cert.expiresAt < new Date()) {
    throw new Error('Certificate not found or expired')
  }
  if (cert.sharingMode !== 'ON_REQUEST') {
    throw new Error('Access requests only supported for ON_REQUEST certificates')
  }

  // Check for existing request
  const existing = await prisma.certificateAccess.findFirst({
    where: {
      certificateId,
      viewerUserId: viewer.userId!,
      accessType: 'ACCESS_REQUESTED',
    },
  })
  if (existing) return { accessId: existing.id }

  const access = await prisma.certificateAccess.create({
    data: {
      certificateId,
      viewerUserId: viewer.userId!,
      viewerType: viewer.role === 'AGENT' ? 'AGENT' : 'LANDLORD',
      accessType: 'ACCESS_REQUESTED',
    },
  })

  // Schedule auto-approve
  // In production, use a background job / Supabase Edge Function cron
  // For MVP, we check on certificate access and auto-approve if overdue

  return { accessId: access.id }
}

export async function revokeCertificate(certificateId: string, tenantId: string): Promise<void> {
  const cert = await prisma.certificate.findUnique({ where: { id: certificateId } })
  if (!cert || cert.tenantId !== tenantId) throw new Error('Certificate not found')

  await prisma.certificate.update({
    where: { id: certificateId },
    data: { isRevoked: true, revokedAt: new Date() },
  })
}

export { getSignedQrUrl }
