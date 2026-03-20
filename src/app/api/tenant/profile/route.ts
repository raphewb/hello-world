import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/utils/auth'
import { prisma } from '@/lib/prisma/client'
import { recomputeTenantScores } from '@/services/trust-score'
import type { ApiResponse } from '@/types'

const UpdateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  dateOfBirth: z.string().optional(),
  nationality: z.string().optional(),
  residencePermitType: z.enum(['CITIZEN', 'PERMIT_B', 'PERMIT_C', 'PERMIT_G', 'PERMIT_L', 'OTHER']).optional(),
  employerName: z.string().optional(),
  employmentType: z.enum(['EMPLOYED', 'SELF_EMPLOYED', 'STUDENT', 'RETIRED', 'OTHER']).optional(),
  monthlyIncomeChf: z.number().int().positive().optional(),
  occupantCount: z.number().int().min(1).max(10).optional(),
  occupantDetails: z.array(z.object({
    name: z.string(),
    relation: z.string(),
    age: z.number().int(),
  })).optional(),
  isSmoker: z.boolean().optional(),
  hasPets: z.boolean().optional(),
  petDetails: z.string().optional(),
  currentAddress: z.string().optional(),
})

export async function GET(): Promise<NextResponse<ApiResponse<unknown>>> {
  const user = await getAuthUser()
  if (!user || user.role !== 'TENANT') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await prisma.tenantProfile.findUnique({
    where: { userId: user.id },
    include: {
      documents: { where: { isCurrent: true }, orderBy: { uploadedAt: 'desc' } },
    },
  })

  if (!profile) {
    return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: profile })
}

export async function PUT(req: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  const user = await getAuthUser()
  if (!user || user.role !== 'TENANT') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = UpdateProfileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 })
  }

  const profile = await prisma.tenantProfile.findUnique({ where: { userId: user.id } })
  if (!profile) {
    return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 })
  }

  const updateData: Record<string, unknown> = { ...parsed.data }
  if (parsed.data.dateOfBirth) {
    updateData.dateOfBirth = new Date(parsed.data.dateOfBirth)
  }

  const updated = await prisma.tenantProfile.update({
    where: { id: profile.id },
    data: updateData,
  })

  await recomputeTenantScores(profile.id)

  return NextResponse.json({ success: true, data: updated })
}
