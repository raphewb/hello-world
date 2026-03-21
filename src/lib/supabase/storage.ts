/**
 * Supabase Storage helpers.
 * NEVER return raw storage paths to the client — always generate signed URLs.
 */

import { createSupabaseServiceClient } from './server'

export const BUCKETS = {
  DOCUMENTS: 'documents',
  QR_CODES: 'qr-codes',
  PDFS: 'pdfs',
} as const

// 15 minutes in seconds — nFADP requirement for sensitive docs
const SENSITIVE_URL_EXPIRY = 15 * 60

export async function getSignedDocumentUrl(storagePath: string): Promise<string> {
  const supabase = createSupabaseServiceClient()
  const { data, error } = await supabase.storage
    .from(BUCKETS.DOCUMENTS)
    .createSignedUrl(storagePath, SENSITIVE_URL_EXPIRY)

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to generate signed URL: ${error?.message}`)
  }
  return data.signedUrl
}

export async function getSignedQrUrl(storagePath: string): Promise<string> {
  const supabase = createSupabaseServiceClient()
  const { data, error } = await supabase.storage
    .from(BUCKETS.QR_CODES)
    .createSignedUrl(storagePath, 60 * 60 * 24 * 90) // QR codes: 90 days

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to generate signed QR URL: ${error?.message}`)
  }
  return data.signedUrl
}

export async function getSignedPdfUrl(storagePath: string): Promise<string> {
  const supabase = createSupabaseServiceClient()
  const { data, error } = await supabase.storage
    .from(BUCKETS.PDFS)
    .createSignedUrl(storagePath, SENSITIVE_URL_EXPIRY)

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to generate signed PDF URL: ${error?.message}`)
  }
  return data.signedUrl
}

export async function uploadDocument(
  tenantId: string,
  documentId: string,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  const supabase = createSupabaseServiceClient()
  const storagePath = `${tenantId}/${documentId}/${fileName}`

  const { error } = await supabase.storage
    .from(BUCKETS.DOCUMENTS)
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    })

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  return storagePath // store path, not URL
}

export async function downloadDocument(storagePath: string): Promise<Buffer> {
  const supabase = createSupabaseServiceClient()
  const { data, error } = await supabase.storage
    .from(BUCKETS.DOCUMENTS)
    .download(storagePath)

  if (error || !data) {
    throw new Error(`Download failed: ${error?.message}`)
  }

  const arrayBuffer = await data.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export async function deleteDocument(storagePath: string): Promise<void> {
  const supabase = createSupabaseServiceClient()
  const { error } = await supabase.storage
    .from(BUCKETS.DOCUMENTS)
    .remove([storagePath])

  if (error) {
    throw new Error(`Delete failed: ${error.message}`)
  }
}
