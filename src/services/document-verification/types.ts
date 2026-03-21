import type { DocumentType } from '@prisma/client'

export type TenantProfileSnapshot = {
  fullName: string
  dateOfBirth: string | null // YYYY-MM-DD
  nationality: string | null
  residencePermitType: string
  employerName: string | null
  employmentType: string
  monthlyIncomeChf: number | null
}

export type ExtractionResult = {
  document_type_confirmed: boolean
  document_legible: boolean
  name_matches_profile?: boolean
  flags: string[]
  [key: string]: unknown
}

export type ValidationResult = {
  confidence: number
  status: 'VERIFIED' | 'PENDING' | 'REJECTED'
  rejectionReason: string | null
  extraction: ExtractionResult
  expiresAt: string | null // ISO date if document has expiry
  validFrom: string | null
}

export type VerificationCallMeta = {
  documentType: DocumentType
  confidenceScore: number
  inputTokens: number
  outputTokens: number
  durationMs: number
  // Never log extracted field values or PII
}
