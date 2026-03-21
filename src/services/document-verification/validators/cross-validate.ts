/**
 * Cross-validates extracted document data against the tenant's declared profile.
 * Called after Claude extraction to derive expiry dates and auto-update profile fields.
 */

import type { DocumentType } from '@prisma/client'
import type { ExtractionResult, TenantProfileSnapshot } from '../types'

export type CrossValidationResult = {
  expiresAt: string | null  // ISO date from extracted doc
  validFrom: string | null
  autoUpdateFields: Partial<{
    nationality: string
    dateOfBirth: string
    residencePermitType: string
    employerName: string
    employmentType: string
    betreibungsauszugClean: boolean
  }>
  profileUpdatePrompts: string[] // fields requiring tenant consent before update
}

export function crossValidate(
  extraction: ExtractionResult,
  documentType: DocumentType,
  _tenant: TenantProfileSnapshot
): CrossValidationResult {
  const result: CrossValidationResult = {
    expiresAt: null,
    validFrom: null,
    autoUpdateFields: {},
    profileUpdatePrompts: [],
  }

  switch (documentType) {
    case 'PASSPORT': {
      const ext = extraction as {
        expiry_date?: string | null
        nationality?: string | null
        date_of_birth?: string | null
      }
      result.expiresAt = ext.expiry_date ?? null
      // Auto-update nationality and DOB if not set
      if (ext.nationality) result.autoUpdateFields.nationality = ext.nationality
      if (ext.date_of_birth) result.autoUpdateFields.dateOfBirth = ext.date_of_birth
      break
    }

    case 'RESIDENCE_PERMIT': {
      const ext = extraction as {
        expiry_date?: string | null
        valid_from?: string | null
        permit_type?: string | null
      }
      result.expiresAt = ext.expiry_date ?? null
      result.validFrom = ext.valid_from ?? null
      if (ext.permit_type) {
        const permitMap: Record<string, string> = {
          B: 'PERMIT_B', C: 'PERMIT_C', G: 'PERMIT_G', L: 'PERMIT_L',
        }
        const mapped = permitMap[ext.permit_type]
        if (mapped) result.autoUpdateFields.residencePermitType = mapped
      }
      break
    }

    case 'SALARY_SLIP_1':
    case 'SALARY_SLIP_2':
    case 'SALARY_SLIP_3': {
      const ext = extraction as {
        gross_salary_chf?: number | null
        employer_name?: string | null
        employment_type?: string | null
      }
      // Prompt tenant to update income — requires consent
      if (ext.gross_salary_chf) {
        result.profileUpdatePrompts.push(
          `We found a gross monthly salary of CHF ${ext.gross_salary_chf.toLocaleString('de-CH')}. Update your income for more accurate rent eligibility?`
        )
      }
      // Auto-update employer if not set
      if (ext.employer_name && !_tenant.employerName) {
        result.autoUpdateFields.employerName = ext.employer_name
      }
      break
    }

    case 'BETREIBUNGSAUSZUG': {
      const ext = extraction as {
        issue_date?: string | null
        has_entries?: boolean
      }
      result.validFrom = ext.issue_date ?? null
      // Betreibungsauszug is valid for 3 months from issue date
      if (ext.issue_date) {
        const expiry = new Date(ext.issue_date)
        expiry.setMonth(expiry.getMonth() + 3)
        result.expiresAt = expiry.toISOString().split('T')[0]
      }
      // Store clean/dirty status for trust score
      if (typeof ext.has_entries === 'boolean') {
        result.autoUpdateFields.betreibungsauszugClean = !ext.has_entries
      }
      break
    }

    case 'LIABILITY_INSURANCE':
    case 'RENTAL_GUARANTEE': {
      const ext = extraction as {
        expiry_date?: string | null
        valid_from?: string | null
      }
      result.expiresAt = ext.expiry_date ?? null
      result.validFrom = ext.valid_from ?? null
      break
    }

    case 'EMPLOYMENT_CONTRACT': {
      const ext = extraction as {
        employer_name?: string | null
        contract_type?: string | null
      }
      if (ext.employer_name && !_tenant.employerName) {
        result.autoUpdateFields.employerName = ext.employer_name
      }
      if (ext.contract_type === 'PERMANENT') {
        result.autoUpdateFields.employmentType = 'EMPLOYED'
      }
      break
    }

    case 'TAX_RETURN': {
      const ext = extraction as { taxable_income_chf?: number | null }
      if (ext.taxable_income_chf) {
        const monthly = Math.round(ext.taxable_income_chf / 12)
        result.profileUpdatePrompts.push(
          `We found a taxable annual income of CHF ${ext.taxable_income_chf.toLocaleString('de-CH')} (~${monthly.toLocaleString('de-CH')}/month). Update your income for more accurate rent eligibility?`
        )
      }
      break
    }
  }

  return result
}
