import type { TenantProfileSnapshot } from '../types'

export function buildRentalGuaranteePrompt(tenant: TenantProfileSnapshot): string {
  return `You are verifying a rental guarantee certificate for a Swiss rental application.

The tenant has declared:
- Full name: ${tenant.fullName}

Analyse this document image and respond with ONLY a valid JSON object — no explanation, no markdown fences, no preamble.

{
  "document_type_confirmed": boolean,
  "guarantee_provider": string | null,
  "beneficiary_name": string | null,
  "guarantee_amount_chf": number | null,
  "valid_from": string | null,
  "expiry_date": string | null,
  "document_legible": boolean,
  "flags": string[]
}

Common providers in Switzerland: SwissCaution, firstcaution, Helvetia. For dates use ISO 8601: YYYY-MM-DD. Flag if the guarantee amount seems unusually low (under 1500 CHF) or high.`
}
