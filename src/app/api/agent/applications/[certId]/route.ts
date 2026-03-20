import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/utils/auth'
import { getCertificateData } from '@/services/certificates'
import { prisma } from '@/lib/prisma/client'
import type { ApiResponse } from '@/types'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ certId: string }> }
): Promise<NextResponse<ApiResponse<unknown>>> {
  const user = await getAuthUser()
  if (!user || user.role !== 'AGENT') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { certId } = await params
  const agent = await prisma.agentProfile.findUnique({ where: { userId: user.id } })
  if (!agent) return NextResponse.json({ success: false, error: 'Agent profile not found' }, { status: 404 })

  const result = await getCertificateData(certId, {
    userId: user.id,
    role: 'AGENT',
    regieId: agent.regieId,
    isVerified: agent.isVerified,
  })

  if (result.tier === 'expired') {
    return NextResponse.json({ success: false, error: 'Certificate expired' }, { status: 410 })
  }
  if (result.tier === 'revoked') {
    return NextResponse.json({ success: false, error: 'Certificate revoked' }, { status: 410 })
  }

  return NextResponse.json({ success: true, data: result })
}
