import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/utils/auth'
import { prisma } from '@/lib/prisma/client'
import { uploadDocument, getSignedDocumentUrl } from '@/lib/supabase/storage'
import { verifyDocument } from '@/services/document-verification'
import type { ApiResponse } from '@/types'
import { nanoid } from 'nanoid'

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20 MB

const DOCUMENT_TYPES = [
  'PASSPORT', 'RESIDENCE_PERMIT', 'SALARY_SLIP_1', 'SALARY_SLIP_2', 'SALARY_SLIP_3',
  'TAX_RETURN', 'BETREIBUNGSAUSZUG', 'REFERENCE_LETTER', 'RENTAL_GUARANTEE',
  'LIABILITY_INSURANCE', 'EMPLOYMENT_CONTRACT', 'OTHER',
] as const

export async function GET(): Promise<NextResponse<ApiResponse<unknown>>> {
  const user = await getAuthUser()
  if (!user || user.role !== 'TENANT') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await prisma.tenantProfile.findUnique({ where: { userId: user.id } })
  if (!profile) return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 })

  const documents = await prisma.document.findMany({
    where: { tenantId: profile.id, isCurrent: true },
    orderBy: { uploadedAt: 'desc' },
  })

  // Add signed URLs for each document
  const docsWithUrls = await Promise.all(
    documents.map(async (doc) => ({
      ...doc,
      signedUrl: await getSignedDocumentUrl(doc.fileUrl),
    }))
  )

  return NextResponse.json({ success: true, data: docsWithUrls })
}

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  const user = await getAuthUser()
  if (!user || user.role !== 'TENANT') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await prisma.tenantProfile.findUnique({ where: { userId: user.id } })
  if (!profile) return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const documentType = formData.get('type') as string | null

  if (!file || !documentType) {
    return NextResponse.json({ success: false, error: 'File and document type are required' }, { status: 400 })
  }

  if (!DOCUMENT_TYPES.includes(documentType as typeof DOCUMENT_TYPES[number])) {
    return NextResponse.json({ success: false, error: 'Invalid document type' }, { status: 400 })
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({ success: false, error: 'File must be PDF, JPEG, PNG or WEBP' }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ success: false, error: 'File must be under 20 MB' }, { status: 400 })
  }

  const documentId = nanoid()
  const fileBuffer = Buffer.from(await file.arrayBuffer())

  // Mark previous document of same type as not current
  await prisma.document.updateMany({
    where: { tenantId: profile.id, type: documentType as typeof DOCUMENT_TYPES[number], isCurrent: true },
    data: { isCurrent: false },
  })

  // Upload to Supabase Storage
  const storagePath = await uploadDocument(
    profile.userId,
    documentId,
    fileBuffer,
    file.name,
    file.type
  )

  // Create document record
  const doc = await prisma.document.create({
    data: {
      id: documentId,
      tenantId: profile.id,
      type: documentType as typeof DOCUMENT_TYPES[number],
      fileUrl: storagePath,
      fileName: file.name,
      fileSizeBytes: file.size,
      verificationStatus: 'PENDING',
      isCurrent: true,
    },
  })

  // Trigger AI verification asynchronously (don't await — return immediately)
  verifyDocument(documentId).catch((err) => {
    console.error(`[documents] Verification failed for ${documentId}:`, err.message)
  })

  return NextResponse.json({ success: true, data: doc }, { status: 201 })
}
