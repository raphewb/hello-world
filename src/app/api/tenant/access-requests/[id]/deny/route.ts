import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/utils/auth'
import { prisma } from '@/lib/prisma/client'
import type { ApiResponse } from '@/types'

export async function POST(
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

  const accessRecord = await prisma.certificateAccess.findUnique({
    where: { id },
    include: { certificate: true },
  })

  if (!accessRecord || accessRecord.certificate.tenantId !== profile.id) {
    return NextResponse.json({ success: false, error: 'Access request not found' }, { status: 404 })
  }

  await prisma.certificateAccess.update({
    where: { id },
    data: { accessType: 'ACCESS_DENIED', deniedAt: new Date() },
  })

  return NextResponse.json({ success: true, data: null })
}
