import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/utils/auth'
import { prisma } from '@/lib/prisma/client'
import type { ApiResponse } from '@/types'

export async function GET(): Promise<NextResponse<ApiResponse<unknown>>> {
  const user = await getAuthUser()
  if (!user || user.role !== 'TENANT') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await prisma.tenantProfile.findUnique({ where: { userId: user.id } })
  if (!profile) return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 })

  // Get pending access requests across all certificates
  const requests = await prisma.certificateAccess.findMany({
    where: {
      certificate: { tenantId: profile.id },
      accessType: 'ACCESS_REQUESTED',
      approvedAt: null,
      deniedAt: null,
    },
    include: {
      certificate: { select: { propertyAddress: true, id: true } },
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

  return NextResponse.json({ success: true, data: requests })
}
