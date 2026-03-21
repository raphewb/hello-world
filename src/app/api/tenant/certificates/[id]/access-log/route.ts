import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/utils/auth'
import { prisma } from '@/lib/prisma/client'
import type { ApiResponse } from '@/types'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<unknown>>> {
  const user = await getAuthUser()
  if (!user || user.role !== 'TENANT') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const profile = await prisma.tenantProfile.findUnique({ where: { userId: user.id } })
  if (!profile) return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 })

  const cert = await prisma.certificate.findUnique({ where: { id } })
  if (!cert || cert.tenantId !== profile.id) {
    return NextResponse.json({ success: false, error: 'Certificate not found' }, { status: 404 })
  }

  const accesses = await prisma.certificateAccess.findMany({
    where: { certificateId: id },
    include: {
      viewerUser: {
        select: {
          email: true,
          role: true,
          agentProfile: { select: { firstName: true, lastName: true, regie: { select: { name: true } } } },
          landlordProfile: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { accessedAt: 'desc' },
  })

  // Redact IP addresses — they're hashed anyway but extra safety
  const sanitised = accesses.map((a) => ({
    id: a.id,
    viewerType: a.viewerType,
    accessType: a.accessType,
    accessedAt: a.accessedAt,
    approvedAt: a.approvedAt,
    deniedAt: a.deniedAt,
    viewerName: a.viewerUser?.agentProfile
      ? `${a.viewerUser.agentProfile.firstName} ${a.viewerUser.agentProfile.lastName}`
      : a.viewerUser?.landlordProfile
      ? `${a.viewerUser.landlordProfile.firstName} ${a.viewerUser.landlordProfile.lastName}`
      : null,
    viewerCompany: a.viewerUser?.agentProfile?.regie?.name ?? null,
  }))

  return NextResponse.json({ success: true, data: sanitised })
}
