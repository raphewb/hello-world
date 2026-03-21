import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/utils/auth'
import { prisma } from '@/lib/prisma/client'
import { createCertificate } from '@/services/certificates'
import type { ApiResponse } from '@/types'

const CreateCertificateSchema = z.object({
  propertyAddress: z.string().min(5),
  monthlyRentChf: z.number().int().positive(),
  sharingMode: z.enum(['DIRECTED', 'OPEN', 'ON_REQUEST']),
  directedRegieId: z.string().uuid().optional(),
  directedAgentId: z.string().uuid().optional(),
  directedOwnerEmail: z.string().email().optional(),
  directedOwnerName: z.string().optional(),
  autoApproveHours: z.number().int().min(0).max(168).optional(), // 0 = never
  notes: z.string().max(500).optional(),
})

export async function GET(): Promise<NextResponse<ApiResponse<unknown>>> {
  const user = await getAuthUser()
  if (!user || user.role !== 'TENANT') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await prisma.tenantProfile.findUnique({ where: { userId: user.id } })
  if (!profile) return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 })

  const certificates = await prisma.certificate.findMany({
    where: { tenantId: profile.id },
    include: {
      directedRegie: { select: { name: true, slug: true } },
      _count: { select: { accesses: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ success: true, data: certificates })
}

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  const user = await getAuthUser()
  if (!user || user.role !== 'TENANT') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await prisma.tenantProfile.findUnique({ where: { userId: user.id } })
  if (!profile) return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 })

  // Free tier: max 3 active certificates per month
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const activeCertsThisMonth = await prisma.certificate.count({
    where: {
      tenantId: profile.id,
      createdAt: { gte: monthStart },
      isRevoked: false,
      expiresAt: { gte: new Date() },
    },
  })

  if (activeCertsThisMonth >= 3) {
    return NextResponse.json(
      { success: false, error: 'Free tier limit: max 3 active certificates per month. Upgrade to create more.', code: 'TIER_LIMIT' },
      { status: 429 }
    )
  }

  const body = await req.json()
  const parsed = CreateCertificateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 })
  }

  const cert = await createCertificate({
    tenantId: profile.id,
    ...parsed.data,
  })

  return NextResponse.json({ success: true, data: cert }, { status: 201 })
}
