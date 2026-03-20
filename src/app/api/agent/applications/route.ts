import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/utils/auth'
import { prisma } from '@/lib/prisma/client'
import type { ApiResponse } from '@/types'

export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  const user = await getAuthUser()
  if (!user || user.role !== 'AGENT') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const agent = await prisma.agentProfile.findUnique({
    where: { userId: user.id },
    include: { regie: true },
  })
  if (!agent) return NextResponse.json({ success: false, error: 'Agent profile not found' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const sortBy = searchParams.get('sort') ?? 'date'

  // Get all certificates directed to this régie or agent, or OPEN certificates with accesses
  const certificates = await prisma.certificate.findMany({
    where: {
      isRevoked: false,
      expiresAt: { gte: new Date() },
      OR: [
        { directedRegieId: agent.regieId },
        { directedAgentId: agent.id },
        {
          sharingMode: 'OPEN',
          accesses: { some: { viewerUserId: user.id } },
        },
        {
          sharingMode: 'ON_REQUEST',
          accesses: {
            some: {
              viewerUserId: user.id,
              accessType: { in: ['ACCESS_APPROVED', 'ACCESS_AUTO_APPROVED'] },
            },
          },
        },
      ],
    },
    include: {
      tenant: {
        select: {
          fullName: true,
          trustScore: true,
          profileCompleteness: true,
          monthlyIncomeChf: true,
          occupantCount: true,
          isSmoker: true,
          hasPets: true,
          verificationStatus: true,
          _count: { select: { documents: true } },
        },
      },
      _count: { select: { accesses: true } },
    },
    orderBy:
      sortBy === 'trust'
        ? { tenant: { trustScore: 'asc' } }
        : sortBy === 'completeness'
        ? { tenant: { profileCompleteness: 'desc' } }
        : { createdAt: 'desc' },
  })

  return NextResponse.json({ success: true, data: certificates })
}
