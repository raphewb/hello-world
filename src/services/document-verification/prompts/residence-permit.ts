import type { TenantProfileSnapshot } from '../types'

export function buildResidencePermitPrompt(tenant: TenantProfileSnapshot): string {
  return `You are verifying a Swiss residence permit for a rental application.

The tenant has declared:
- Full name: ${tenant.fullName}
- Permit type: ${tenant.residencePermitType}

Analyse this document image and respond with ONLY a valid JSON object — no explanation, no markdown fences, no preamble.

{
  "document_type_confirmed": boolean,
  "permit_type": "B" | "C" | "G" | "L" | "N" | "F" | "other" | null,
  "holder_name": string | null,
  "date_of_birth": string | null,
  "valid_from": string | null,
  "expiry_date": string | null,
  "issuing_canton": string | null,
  "name_matches_profile": boolean,
  "permit_type_matches_profile": boolean,
  "document_legible": boolean,
  "flags": string[]
}

For dates use ISO 8601: YYYY-MM-DD. Note that Permit C is indefinite and may not have an expiry date — that is normal. Swiss citizens will not have a permit; flag if a citizen uploaded this type of document.`
}
