import type { TenantProfileSnapshot } from '../types'

export function buildPassportPrompt(tenant: TenantProfileSnapshot): string {
  return `You are verifying a Swiss rental application document. This document is expected to be a passport or national ID card.

The tenant has declared:
- Full name: ${tenant.fullName}
- Date of birth: ${tenant.dateOfBirth ?? 'not provided'}
- Nationality: ${tenant.nationality ?? 'not provided'}

Analyse this document image and respond with ONLY a valid JSON object — no explanation, no markdown fences, no preamble.

{
  "document_type_confirmed": boolean,
  "document_subtype": "PASSPORT" | "ID_CARD" | "DRIVING_LICENCE" | "OTHER",
  "full_name": string | null,
  "date_of_birth": string | null,
  "document_number": string | null,
  "nationality": string | null,
  "expiry_date": string | null,
  "issuing_country": string | null,
  "mrz_readable": boolean,
  "name_matches_profile": boolean,
  "dob_matches_profile": boolean,
  "document_legible": boolean,
  "flags": string[]
}

For dates use ISO 8601 format: YYYY-MM-DD. If a field is not visible, use null. For name matching, be tolerant of accents, hyphens, and ordering differences (e.g. "DUPONT Marie" matches "Marie Dupont"). Flags should be plain English observations about concerns or inconsistencies.`
}
