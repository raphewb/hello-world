import type { TenantProfileSnapshot } from '../types'

export function buildLiabilityInsurancePrompt(tenant: TenantProfileSnapshot): string {
  return `You are verifying a personal liability insurance certificate for a Swiss rental application.

The tenant has declared:
- Full name: ${tenant.fullName}

Analyse this document image and respond with ONLY a valid JSON object — no explanation, no markdown fences, no preamble.

{
  "document_type_confirmed": boolean,
  "insured_name": string | null,
  "policy_number": string | null,
  "insurer_name": string | null,
  "covers_personal_liability": boolean,
  "valid_from": string | null,
  "expiry_date": string | null,
  "name_matches_profile": boolean,
  "document_legible": boolean,
  "flags": string[]
}

For dates use ISO 8601: YYYY-MM-DD. covers_personal_liability must be true — flag if this is a property insurance or travel insurance rather than personal liability (RC personnelle / Haftpflichtversicherung).`
}
