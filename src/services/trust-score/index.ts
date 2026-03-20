/**
 * Trust Score & Profile Completeness computation
 * These are pure functions — no DB calls. Called after document updates.
 */

import type { Document, TenantProfile } from '@prisma/client'
import type { CompletenessBreakdown, TrustScoreInput } from '@/types'

type DocumentWithStatus = Pick<Document, 'type' | 'verificationStatus' | 'isCurrent' | 'expiresAt'>

// ─── Profile Completeness ─────────────────────────────────────────────────────

/**
 * Weights:
 *   Core (60%): passport 20%, betreibungsauszug 20%, salary/tax 20%
 *   Important (40%): residence permit 10%, reference letter 10%, liability 10%, guarantee 10%
 */
export function computeProfileCompleteness(documents: DocumentWithStatus[]): {
  score: number
  breakdown: CompletenessBreakdown
} {
  const verified = (type: Document['type']) =>
    documents.some(
      (d) =>
        d.type === type &&
        d.isCurrent &&
        (d.verificationStatus === 'VERIFIED' || d.verificationStatus === 'EXPIRING_SOON')
    )

  const breakdown: CompletenessBreakdown = {
    total: 0,
    passport: verified('PASSPORT'),
    betreibungsauszug: verified('BETREIBUNGSAUSZUG'),
    salaryOrTax:
      verified('SALARY_SLIP_1') || verified('TAX_RETURN') || verified('EMPLOYMENT_CONTRACT'),
    residencePermit: verified('RESIDENCE_PERMIT'),
    referenceLetter: verified('REFERENCE_LETTER'),
    liabilityInsurance: verified('LIABILITY_INSURANCE'),
    rentalGuarantee: verified('RENTAL_GUARANTEE'),
  }

  let score = 0
  if (breakdown.passport) score += 20
  if (breakdown.betreibungsauszug) score += 20
  if (breakdown.salaryOrTax) score += 20
  if (breakdown.residencePermit) score += 10
  if (breakdown.referenceLetter) score += 10
  if (breakdown.liabilityInsurance) score += 10
  if (breakdown.rentalGuarantee) score += 10

  breakdown.total = score

  return { score, breakdown }
}

// ─── Trust Score ──────────────────────────────────────────────────────────────

export function computeTrustScore(input: TrustScoreInput): TenantProfile['trustScore'] {
  const {
    profileCompleteness,
    betreibungsauszugClean,
    monthlyIncomeChf,
    monthlyRentChf,
    documentsVerified,
    documentsTotal,
  } = input

  // Scoring criteria
  const hasCleanRecord = betreibungsauszugClean === true
  const incomeQualifies =
    monthlyIncomeChf !== null && monthlyRentChf > 0
      ? monthlyIncomeChf >= monthlyRentChf * 3
      : null
  const verificationRatio = documentsTotal > 0 ? documentsVerified / documentsTotal : 0

  // Grade A: complete dossier + clean record + income qualifies
  if (
    profileCompleteness >= 80 &&
    hasCleanRecord &&
    (incomeQualifies === true || incomeQualifies === null) &&
    verificationRatio >= 0.8
  ) {
    return 'A'
  }

  // Grade B: mostly complete + no major issues
  if (profileCompleteness >= 50 && betreibungsauszugClean !== false && verificationRatio >= 0.5) {
    return 'B'
  }

  // Grade C: incomplete or issues
  if (profileCompleteness > 0) {
    return 'C'
  }

  return 'UNRATED'
}

// ─── DB updater (called from document verification flow) ──────────────────────

import { prisma } from '@/lib/prisma/client'

export async function recomputeTenantScores(tenantId: string): Promise<void> {
  const profile = await prisma.tenantProfile.findUnique({
    where: { id: tenantId },
    include: {
      documents: { where: { isCurrent: true } },
    },
  })

  if (!profile) return

  const { score } = computeProfileCompleteness(profile.documents)
  const verifiedDocs = profile.documents.filter(
    (d) => d.verificationStatus === 'VERIFIED' || d.verificationStatus === 'EXPIRING_SOON'
  )

  // Use a representative rent (if no certificate, use a default of 2000 for scoring)
  const trustScore = computeTrustScore({
    profileCompleteness: score,
    betreibungsauszugClean: profile.betreibungsauszugClean,
    monthlyIncomeChf: profile.monthlyIncomeChf,
    monthlyRentChf: 2000,
    documentsVerified: verifiedDocs.length,
    documentsTotal: profile.documents.length,
  })

  await prisma.tenantProfile.update({
    where: { id: tenantId },
    data: {
      profileCompleteness: score,
      trustScore,
    },
  })
}
