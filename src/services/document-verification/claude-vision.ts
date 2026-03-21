/**
 * Claude Vision integration for document analysis.
 * Downloads documents server-side, converts PDFs to PNG, sends to Claude claude-opus-4-6.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { DocumentType } from '@prisma/client'
import type { ExtractionResult, TenantProfileSnapshot, VerificationCallMeta } from './types'
import { buildPassportPrompt } from './prompts/passport'
import { buildBetreibungsauszugPrompt } from './prompts/betreibungsauszug'
import { buildSalarySlipPrompt } from './prompts/salary-slip'
import { buildResidencePermitPrompt } from './prompts/residence-permit'
import { buildReferenceLetterPrompt } from './prompts/reference-letter'
import { buildLiabilityInsurancePrompt } from './prompts/liability-insurance'
import { buildRentalGuaranteePrompt } from './prompts/rental-guarantee'
import { buildTaxReturnPrompt } from './prompts/tax-return'
import { buildEmploymentContractPrompt } from './prompts/employment-contract'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

function buildPrompt(documentType: DocumentType, tenant: TenantProfileSnapshot): string {
  switch (documentType) {
    case 'PASSPORT':
      return buildPassportPrompt(tenant)
    case 'RESIDENCE_PERMIT':
      return buildResidencePermitPrompt(tenant)
    case 'SALARY_SLIP_1':
    case 'SALARY_SLIP_2':
    case 'SALARY_SLIP_3':
      return buildSalarySlipPrompt(tenant)
    case 'BETREIBUNGSAUSZUG':
      return buildBetreibungsauszugPrompt(tenant)
    case 'REFERENCE_LETTER':
      return buildReferenceLetterPrompt(tenant)
    case 'LIABILITY_INSURANCE':
      return buildLiabilityInsurancePrompt(tenant)
    case 'RENTAL_GUARANTEE':
      return buildRentalGuaranteePrompt(tenant)
    case 'TAX_RETURN':
      return buildTaxReturnPrompt(tenant)
    case 'EMPLOYMENT_CONTRACT':
      return buildEmploymentContractPrompt(tenant)
    default:
      return `Analyse this document and return a JSON object with: { "document_type_confirmed": false, "document_legible": boolean, "flags": string[] }`
  }
}

async function pdfFirstPageToBuffer(pdfBuffer: Buffer): Promise<Buffer> {
  // Dynamically import pdf2pic to avoid issues if native deps not installed
  const { fromBuffer } = await import('pdf2pic')
  const convert = fromBuffer(pdfBuffer, {
    density: 200,
    format: 'png',
    width: 2000,
    height: 2800,
  })
  const result = await convert(1, { responseType: 'buffer' })
  if (!result.buffer) throw new Error('PDF conversion produced no buffer')
  return result.buffer
}

function parseExtractionResponse(raw: string, documentType: DocumentType): ExtractionResult {
  // Strip markdown fences if Claude adds them despite instructions
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  try {
    const parsed = JSON.parse(cleaned)
    // Ensure required fields exist
    return {
      document_type_confirmed: Boolean(parsed.document_type_confirmed),
      document_legible: Boolean(parsed.document_legible ?? true),
      flags: Array.isArray(parsed.flags) ? parsed.flags : [],
      ...parsed,
    }
  } catch {
    // Malformed JSON — treat as low-confidence, send to human review
    console.error(`[document-verification] Malformed JSON from Claude for ${documentType}`)
    return {
      document_type_confirmed: false,
      document_legible: false,
      flags: ['Claude returned malformed JSON — manual review required'],
    }
  }
}

export type AnalyseDocumentResult = {
  extraction: ExtractionResult
  meta: VerificationCallMeta
}

export async function analyseDocument(
  fileBuffer: Buffer,
  mimeType: string,
  documentType: DocumentType,
  tenantProfile: TenantProfileSnapshot
): Promise<AnalyseDocumentResult> {
  const startTime = Date.now()

  // Convert PDF to PNG for Claude vision
  let imageBuffer = fileBuffer
  let imageMimeType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg'

  if (mimeType === 'application/pdf') {
    imageBuffer = await pdfFirstPageToBuffer(fileBuffer)
    imageMimeType = 'image/png'
  } else if (mimeType === 'image/png') {
    imageMimeType = 'image/png'
  } else if (mimeType === 'image/webp') {
    imageMimeType = 'image/webp'
  } else {
    imageMimeType = 'image/jpeg'
  }

  const base64 = imageBuffer.toString('base64')
  const prompt = buildPrompt(documentType, tenantProfile)

  // Retry logic: up to 3 attempts with exponential backoff
  let lastError: Error | null = null
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      const delay = Math.pow(4, attempt) * 1000 // 4s, 16s
      await new Promise((r) => setTimeout(r, delay))
    }

    try {
      const response = await anthropic.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: imageMimeType,
                  data: base64,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      })

      const raw =
        response.content[0].type === 'text' ? response.content[0].text : ''
      const extraction = parseExtractionResponse(raw, documentType)

      const meta: VerificationCallMeta = {
        documentType,
        confidenceScore: 0, // computed separately
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        durationMs: Date.now() - startTime,
      }

      return { extraction, meta }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      console.error(`[document-verification] Attempt ${attempt + 1} failed:`, lastError.message)
    }
  }

  // All retries exhausted
  throw lastError ?? new Error('Claude API call failed after 3 attempts')
}
