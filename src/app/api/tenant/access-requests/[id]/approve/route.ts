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
    include: {
      certificate: true,
      viewerUser: {
        select: {
          email: true,
          agentProfile: { select: { firstName: true, lastName: true } },
          landlordProfile: { select: { firstName: true, lastName: true } },
        },
      },
    },
  })

  if (!accessRecord || accessRecord.certificate.tenantId !== profile.id) {
    return NextResponse.json({ success: false, error: 'Access request not found' }, { status: 404 })
  }

  await prisma.certificateAccess.update({
    where: { id },
    data: { accessType: 'ACCESS_APPROVED', approvedAt: new Date() },
  })

  // Notify viewer
  if (accessRecord.viewerUser?.email) {
    const viewerName = accessRecord.viewerUser.agentProfile
      ? `${accessRecord.viewerUser.agentProfile.firstName} ${accessRecord.viewerUser.agentProfile.lastName}`
      : accessRecord.viewerUser.landlordProfile
      ? `${accessRecord.viewerUser.landlordProfile.firstName} ${accessRecord.viewerUser.landlordProfile.lastName}`
      : 'User'

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://swisstrust.ch'
    const { sendAccessApprovedEmail } = await import('@/lib/email')
    sendAccessApprovedEmail(
      accessRecord.viewerUser.email,
      viewerName,
      profile.fullName,
      accessRecord.certificate.propertyAddress,
      `${appUrl}/c/${accessRecord.certificateId}`
    ).catch(console.error)
  }

  return NextResponse.json({ success: true, data: null })
}
