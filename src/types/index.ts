// SwissTrust Dossier — Shared TypeScript types

import type {
  User,
  TenantProfile,
  AgentProfile,
  LandlordProfile,
  Document,
  Certificate,
  CertificateAccess,
  Regie,
  DocumentType,
  SharingMode,
  TrustScore,
} from '@prisma/client'

// ─── Auth ─────────────────────────────────────────────────────────────────────

export type AuthUser = {
  id: string
  email: string
  role: User['role']
  profile: TenantProfile | AgentProfile | LandlordProfile | null
}

// ─── Certificate data tiers ───────────────────────────────────────────────────

export type CertificatePublicSummary = {
  id: string
  tenantName: string
  avatarInitials: string
  trustScore: TrustScore
  verificationStatus: TenantProfile['verificationStatus']
  profileCompleteness: number
  occupantCount: number
  isSmoker: boolean
  hasPets: boolean
  petDetails: string | null
  rentEligibilityMin: number // e.g. 2000 if income 6000
  rentEligibilityMax: number // e.g. 3000
  qualifiesForRent: boolean
  monthlyRentChf: number
  propertyAddress: string
  documentsVerifiedCount: number
  documentsTotalCount: number
  sharingMode: SharingMode
  expiresAt: string
  isRevoked: boolean
  createdAt: string
}

export type CertificateFullDossier = CertificatePublicSummary & {
  nationality: string | null
  residencePermitType: TenantProfile['residencePermitType']
  employmentType: TenantProfile['employmentType']
  employerName: string | null
  currentAddress: string | null
  dateOfBirth: string | null
  occupantDetails: Array<{ name: string; relation: string; age: number }>
  documents: DocumentWithSignedUrl[]
}

export type DocumentWithSignedUrl = {
  id: string
  type: DocumentType
  fileName: string
  verificationStatus: Document['verificationStatus']
  aiConfidenceScore: number | null
  validFrom: string | null
  expiresAt: string | null
  uploadedAt: string
  signedUrl: string // 15-min signed URL
  aiExtractedData: Record<string, unknown> | null
}

// ─── API Response types ────────────────────────────────────────────────────────

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string }

// ─── Document verification ─────────────────────────────────────────────────────

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
}

// ─── Profile completeness ─────────────────────────────────────────────────────

export type CompletenessBreakdown = {
  total: number
  passport: boolean
  betreibungsauszug: boolean
  salaryOrTax: boolean
  residencePermit: boolean
  referenceLetter: boolean
  liabilityInsurance: boolean
  rentalGuarantee: boolean
}

// ─── Trust score input ────────────────────────────────────────────────────────

export type TrustScoreInput = {
  profileCompleteness: number
  betreibungsauszugClean: boolean | null
  monthlyIncomeChf: number | null
  monthlyRentChf: number
  documentsVerified: number
  documentsTotal: number
}

// ─── Régie directory search ───────────────────────────────────────────────────

export type RegieSearchResult = {
  id: string
  name: string
  slug: string
  address: string
  canton: string
  email: string | null
  hasAccount: boolean
  isVerified: boolean
  logoUrl: string | null
}
