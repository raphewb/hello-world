import type { TenantProfileSnapshot } from '../types'

export function buildTaxReturnPrompt(tenant: TenantProfileSnapshot): string {
  return `You are verifying a Swiss tax return document for a rental application.

The tenant has declared:
- Full name: ${tenant.fullName}

Analyse this document image and respond with ONLY a valid JSON object — no explanation, no markdown fences, no preamble.

{
  "document_type_confirmed": boolean,
  "taxpayer_name": string | null,
  "tax_year": number | null,
  "canton": string | null,
  "taxable_income_chf": number | null,
  "name_matches_profile": boolean,
  "document_legible": boolean,
  "flags": string[]
}

Note: document_type_confirmed = true means this is a tax RETURN or official tax assessment (taxation), not just a tax bill (facture fiscale). Flag if the document is more than 2 years old.`
}
