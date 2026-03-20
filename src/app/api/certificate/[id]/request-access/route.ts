import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/utils/auth'
import { requestCertificateAccess } from '@/services/certificates'
import { prisma } from '@/lib/prisma/client'
import type { ApiResponse } from '@/types'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<{ accessId: string }>>> {
  const user = await getAuthUser()
  if (!user || (user.role !== 'AGENT' && user.role !== 'LANDLORD')) {
    return NextResponse.json({ success: false, error: 'Only verified professionals can request access' }, { status: 401 })
  }

  const { id } = await params

  try {
    const result = await requestCertificateAccess(id, {
      userId: user.id,
      role: user.role,
    })

    // Get cert info for notification
    const cert = await prisma.certificate.findUnique({
      where: { id },
      include: {
        tenant: { include: { user: { select: { email: true } } } },
      },
    })

    if (cert) {
      // Get viewer name for notification
      const agentProfile = user.role === 'AGENT'
        ? await prisma.agentProfile.findUnique({ where: { userId: user.id }, include: { regie: true } })
        : null
      const landlordProfile = user.role === 'LANDLORD'
        ? await prisma.landlordProfile.findUnique({ where: { userId: user.id } })
        : null

      const viewerName = agentProfile
        ? `${agentProfile.firstName} ${agentProfile.lastName}`
        : landlordProfile
        ? `${landlordProfile.firstName} ${landlordProfile.lastName}`
        : 'A professional'
      const viewerCompany = agentProfile?.regie?.name ?? 'Private'

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://swisstrust.ch'
      const approveUrl = `${appUrl}/api/tenant/access-requests/${result.accessId}/approve?token=${result.accessId}`
      const denyUrl = `${appUrl}/api/tenant/access-requests/${result.accessId}/deny?token=${result.accessId}`

      // Send notification (fire and forget)
      if (cert.tenant.user?.email) {
        const { sendAccessRequestNotification } = await import('@/lib/email')
        sendAccessRequestNotification(
          cert.tenant.user.email,
          cert.tenant.fullName,
          viewerName,
          viewerCompany,
          cert.propertyAddress,
          approveUrl,
          denyUrl,
          cert.autoApproveHours
        ).catch(console.error)
      }

      // In-app notification
      await prisma.notification.create({
        data: {
          userId: cert.tenant.userId,
          type: 'ACCESS_REQUEST',
          title: 'Dossier access request',
          body: `${viewerName} from ${viewerCompany} has requested access to your dossier for ${cert.propertyAddress}.`,
          data: { certificateId: id, accessId: result.accessId },
        },
      })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 })
  }
}
