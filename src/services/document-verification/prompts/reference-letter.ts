import type { TenantProfileSnapshot } from '../types'

export function buildReferenceLetterPrompt(tenant: TenantProfileSnapshot): string {
  return `You are verifying a landlord or employer reference letter for a Swiss rental application.

The tenant has declared:
- Full name: ${tenant.fullName}

Analyse this document image and respond with ONLY a valid JSON object — no explanation, no markdown fences, no preamble.

{
  "document_type_confirmed": boolean,
  "author_name": string | null,
  "author_role": string | null,
  "tenant_name": string | null,
  "tenancy_address": string | null,
  "tenancy_duration_months": number | null,
  "letter_date": string | null,
  "recommendation_sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE",
  "name_matches_profile": boolean,
  "document_legible": boolean,
  "flags": string[]
}

For letter_date use ISO 8601: YYYY-MM-DD. Assess sentiment based on the tone and content of the letter. Flag if the letter appears generic, templated, or lacks specific details about the tenant.`
}
