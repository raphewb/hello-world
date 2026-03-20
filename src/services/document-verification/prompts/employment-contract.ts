import type { TenantProfileSnapshot } from '../types'

export function buildEmploymentContractPrompt(tenant: TenantProfileSnapshot): string {
  return `You are verifying an employment contract for a Swiss rental application.

The tenant has declared:
- Full name: ${tenant.fullName}
- Employer: ${tenant.employerName ?? 'not provided'}

Analyse this document image and respond with ONLY a valid JSON object — no explanation, no markdown fences, no preamble.

{
  "document_type_confirmed": boolean,
  "employee_name": string | null,
  "employer_name": string | null,
  "start_date": string | null,
  "contract_type": "PERMANENT" | "FIXED_TERM" | "TRIAL" | null,
  "gross_monthly_salary_chf": number | null,
  "position_title": string | null,
  "name_matches_profile": boolean,
  "employer_matches_profile": boolean,
  "document_legible": boolean,
  "flags": string[]
}

For dates use ISO 8601: YYYY-MM-DD. Flag if contract is a trial period (période d'essai / Probezeit) as this may affect tenant stability. Flag if contract is fixed-term with less than 6 months remaining.`
}
