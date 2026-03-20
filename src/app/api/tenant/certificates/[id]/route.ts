import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/utils/auth'
import { prisma } from '@/lib/prisma/client'
import { getSignedQrUrl } from '@/services/certificates'
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

  const cert = await prisma.certificate.findUnique({
    where: { id },
    include: {
      directedRegie: { select: { name: true, slug: true } },
      directedAgent: { select: { firstName: true, lastName: true } },
      _count: { select: { accesses: true } },
    },
  })

  if (!cert || cert.tenantId !== profile.id) {
    return NextResponse.json({ success: false, error: 'Certificate not found' }, { status: 404 })
  }

  // Generate signed QR URL
  const qrSignedUrl = cert.qrCodeUrl ? await getSignedQrUrl(cert.qrCodeUrl) : null

  return NextResponse.json({
    success: true,
    data: {
      ...cert,
      qrSignedUrl,
      shareUrl: `${process.env.NEXT_PUBLIC_APP_URL}/c/${cert.id}`,
    },
  })
}
