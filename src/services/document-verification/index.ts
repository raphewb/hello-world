/**
 * DocumentVerificationService — public interface
 * All other code imports from here only.
 */

import type { DocumentType } from '@prisma/client'
import { prisma } from '@/lib/prisma/client'
import { downloadDocument } from '@/lib/supabase/storage'
import { analyseDocument } from './claude-vision'
import { computeConfidence, confidenceToStatus, buildRejectionReason } from './validators/confidence'
import { crossValidate } from './validators/cross-validate'
import { recomputeTenantScores } from '@/services/trust-score'
import type { TenantProfileSnapshot } from './types'

export async function verifyDocument(documentId: string): Promise<void> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      tenant: true,
    },
  })

  if (!doc) throw new Error(`Document not found: ${documentId}`)
  if (doc.verificationStatus !== 'PENDING') return // already processed

  const tenantSnapshot: TenantProfileSnapshot = {
    fullName: doc.tenant.fullName,
    dateOfBirth: doc.tenant.dateOfBirth?.toISOString().split('T')[0] ?? null,
    nationality: doc.tenant.nationality,
    residencePermitType: doc.tenant.residencePermitType,
    employerName: doc.tenant.employerName,
    employmentType: doc.tenant.employmentType,
    monthlyIncomeChf: doc.tenant.monthlyIncomeChf,
  }

  let result: Awaited<ReturnType<typeof analyseDocument>> | null = null
  let verificationFailed = false

  try {
    // Download file server-side
    const fileBuffer = await downloadDocument(doc.fileUrl)
    const mimeType = inferMimeType(doc.fileName)

    result = await analyseDocument(fileBuffer, mimeType, doc.type, tenantSnapshot)
  } catch (err) {
    console.error(`[document-verification] Failed for document ${documentId}:`, (err as Error).message)
    verificationFailed = true
  }

  if (verificationFailed || !result) {
    // Keep in PENDING, escalate to admin queue
    await prisma.document.update({
      where: { id: documentId },
      data: {
        aiRejectionReason: 'Automated verification temporarily unavailable. Your document will be reviewed manually within 24 hours.',
      },
    })
    return
  }

  const confidence = computeConfidence(result.extraction, doc.type)
  const status = confidenceToStatus(confidence)
  const rejectionReason = status === 'REJECTED'
    ? buildRejectionReason(result.extraction, doc.type)
    : null

  const crossVal = crossValidate(result.extraction, doc.type, tenantSnapshot)

  // Map our status to DocumentVerificationStatus enum
  const docStatus = status === 'VERIFIED'
    ? 'VERIFIED' as const
    : status === 'REJECTED'
    ? 'REJECTED' as const
    : 'PENDING' as const

  // Determine if document is EXPIRING_SOON or EXPIRED
  type DocVerifStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED' | 'EXPIRING_SOON'
  let finalStatus: DocVerifStatus = docStatus
  if (docStatus === 'VERIFIED' && crossVal.expiresAt) {
    const daysLeft = Math.ceil(
      (new Date(crossVal.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
    if (daysLeft <= 0) finalStatus = 'EXPIRED'
    else if (daysLeft <= 30) finalStatus = 'EXPIRING_SOON'
  }

  // Store extraction result with metadata (no PII in logs)
  const aiExtractedData = {
    ...result.extraction,
    _meta: {
      model: 'claude-opus-4-6',
      extracted_at: new Date().toISOString(),
      confidence_score: confidence,
      input_tokens: result.meta.inputTokens,
      output_tokens: result.meta.outputTokens,
      duration_ms: result.meta.durationMs,
    },
  }

  await prisma.$transaction(async (tx) => {
    // Update document
    await tx.document.update({
      where: { id: documentId },
      data: {
        verificationStatus: finalStatus,
        aiConfidenceScore: confidence,
        aiVerifiedAt: new Date(),
        aiRejectionReason: rejectionReason,
        aiExtractedData,
        validFrom: crossVal.validFrom ? new Date(crossVal.validFrom) : null,
        expiresAt: crossVal.expiresAt ? new Date(crossVal.expiresAt) : null,
      },
    })

    // Auto-update profile fields (no consent required for these)
    const autoFields = crossVal.autoUpdateFields
    const profileUpdates: Record<string, unknown> = {}

    if (autoFields.nationality && !doc.tenant.nationality) {
      profileUpdates.nationality = autoFields.nationality
    }
    if (autoFields.dateOfBirth && !doc.tenant.dateOfBirth) {
      profileUpdates.dateOfBirth = new Date(autoFields.dateOfBirth)
    }
    if (autoFields.residencePermitType) {
      profileUpdates.residencePermitType = autoFields.residencePermitType
    }
    if (autoFields.employerName && !doc.tenant.employerName) {
      profileUpdates.employerName = autoFields.employerName
    }
    if (typeof autoFields.betreibungsauszugClean === 'boolean') {
      profileUpdates.betreibungsauszugClean = autoFields.betreibungsauszugClean
    }

    if (Object.keys(profileUpdates).length > 0) {
      await tx.tenantProfile.update({
        where: { id: doc.tenantId },
        data: profileUpdates,
      })
    }
  })

  // Recompute trust score and profile completeness
  await recomputeTenantScores(doc.tenantId)

  // TODO: send in-app notification + email to tenant with outcome
}

function inferMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'pdf': return 'application/pdf'
    case 'png': return 'image/png'
    case 'jpg':
    case 'jpeg': return 'image/jpeg'
    case 'webp': return 'image/webp'
    default: return 'image/jpeg'
  }
}

export { computeConfidence } from './validators/confidence'
export { crossValidate } from './validators/cross-validate'
export type { TenantProfileSnapshot, ExtractionResult, ValidationResult } from './types'
