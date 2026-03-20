import type { TenantProfileSnapshot } from '../types'

export function buildBetreibungsauszugPrompt(tenant: TenantProfileSnapshot): string {
  return `You are verifying a Swiss Betreibungsauszug (debt register extract) for a rental application.

The tenant has declared:
- Full name: ${tenant.fullName}
- Date of birth: ${tenant.dateOfBirth ?? 'not provided'}

Analyse this document image and respond with ONLY a valid JSON object — no explanation, no markdown fences, no preamble.

{
  "document_type_confirmed": boolean,
  "subject_name": string | null,
  "subject_address": string | null,
  "issue_date": string | null,
  "issuing_office": string | null,
  "has_entries": boolean,
  "entry_count": number,
  "total_amount_chf": number | null,
  "language": "de" | "fr" | "it" | "unknown",
  "name_matches_profile": boolean,
  "name_match_confidence": number,
  "document_legible": boolean,
  "flags": string[]
}

Critical: "has_entries" = true means debts exist, false means clean record. "issue_date" is critical for validity (Betreibungsauszug expires after 3 months). For dates use ISO 8601: YYYY-MM-DD. Flags should be plain English observations.`
}
