import type { TenantProfileSnapshot } from '../types'

export function buildSalarySlipPrompt(tenant: TenantProfileSnapshot): string {
  return `You are verifying a salary slip for a Swiss rental application.

The tenant has declared:
- Full name: ${tenant.fullName}
- Employer: ${tenant.employerName ?? 'not provided'}
- Employment type: ${tenant.employmentType}

Analyse this document image and respond with ONLY a valid JSON object — no explanation, no markdown fences, no preamble.

{
  "document_type_confirmed": boolean,
  "employer_name": string | null,
  "employee_name": string | null,
  "pay_period_month": number | null,
  "pay_period_year": number | null,
  "gross_salary_chf": number | null,
  "net_salary_chf": number | null,
  "currency": string | null,
  "employment_type": "EMPLOYED" | "SELF_EMPLOYED" | "OTHER" | null,
  "name_matches_profile": boolean,
  "employer_matches_profile": boolean,
  "currency_is_chf": boolean,
  "document_legible": boolean,
  "flags": string[]
}

Note: employer_matches_profile = false is NOT a rejection reason — people change employers. It's just an information flag. currency_is_chf must be true for Swiss rental; flag if salary is in EUR or USD.`
}
