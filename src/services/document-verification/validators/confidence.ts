import type { DocumentType } from '@prisma/client'
import type { ExtractionResult } from '../types'

export function computeConfidence(
  extraction: ExtractionResult,
  documentType: DocumentType
): number {
  let score = 1.0

  // Hard failures
  if (!extraction.document_type_confirmed) return 0.1
  if (!extraction.document_legible) return 0.2

  // Name mismatch — more serious for identity docs
  if ('name_matches_profile' in extraction && !extraction.name_matches_profile) {
    const isIdentityDoc = ['PASSPORT', 'RESIDENCE_PERMIT', 'BETREIBUNGSAUSZUG'].includes(
      documentType
    )
    score -= isIdentityDoc ? 0.35 : 0.15
  }

  // DOB mismatch on identity docs
  if ('dob_matches_profile' in extraction && !extraction.dob_matches_profile) {
    score -= 0.3
  }

  // Wrong currency (salary slip)
  if ('currency_is_chf' in extraction && !extraction.currency_is_chf) {
    score -= 0.25
  }

  // Insurance doesn't cover personal liability
  if (
    'covers_personal_liability' in extraction &&
    !extraction.covers_personal_liability
  ) {
    score -= 0.3
  }

  // Each flag adds a small penalty
  const flagCount = Array.isArray(extraction.flags) ? extraction.flags.length : 0
  score -= flagCount * 0.05

  return Math.max(0.05, Math.min(1.0, score))
}

export function confidenceToStatus(
  confidence: number
): 'VERIFIED' | 'PENDING' | 'REJECTED' {
  if (confidence >= 0.9) return 'VERIFIED'
  if (confidence >= 0.65) return 'PENDING'
  return 'REJECTED'
}

export function buildRejectionReason(
  extraction: ExtractionResult,
  documentType: DocumentType
): string | null {
  if (!extraction.document_type_confirmed) {
    return 'This does not appear to be the expected document type. Please upload the correct document.'
  }

  if (!extraction.document_legible) {
    return 'The document is not legible. Please upload a clearer scan or photo (minimum 200 DPI recommended).'
  }

  if ('name_matches_profile' in extraction && !extraction.name_matches_profile) {
    const isIdentityDoc = ['PASSPORT', 'RESIDENCE_PERMIT', 'BETREIBUNGSAUSZUG'].includes(
      documentType
    )
    if (isIdentityDoc) {
      return 'The name on this document does not match your profile name. Please upload a document in your registered name, or update your profile name and re-submit.'
    }
  }

  if ('dob_matches_profile' in extraction && !extraction.dob_matches_profile) {
    return 'The date of birth on this document does not match your profile. Please verify your date of birth in your profile settings.'
  }

  if ('currency_is_chf' in extraction && !extraction.currency_is_chf) {
    return 'Salary documents must show a Swiss Franc (CHF) salary. If you are paid in a foreign currency, please contact support.'
  }

  if (
    'covers_personal_liability' in extraction &&
    !extraction.covers_personal_liability
  ) {
    return 'This insurance does not cover personal liability (RC personnelle). Swiss landlords require personal liability insurance, not property or travel insurance.'
  }

  const flags = Array.isArray(extraction.flags) ? extraction.flags : []
  if (flags.length > 0) {
    return `Document flagged for review: ${flags[0]}. Please re-upload a clearer copy or contact support if you believe this is an error.`
  }

  return null
}
