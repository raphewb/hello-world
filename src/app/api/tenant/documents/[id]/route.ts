import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/utils/auth'
import { prisma } from '@/lib/prisma/client'
import { deleteDocument } from '@/lib/supabase/storage'
import type { ApiResponse } from '@/types'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<null>>> {
  const user = await getAuthUser()
  if (!user || user.role !== 'TENANT') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const profile = await prisma.tenantProfile.findUnique({ where: { userId: user.id } })
  if (!profile) return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 })

  const doc = await prisma.document.findUnique({ where: { id } })
  if (!doc || doc.tenantId !== profile.id) {
    return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 })
  }

  // Delete from storage
  await deleteDocument(doc.fileUrl)

  // Delete from DB
  await prisma.document.delete({ where: { id } })

  return NextResponse.json({ success: true, data: null })
}
