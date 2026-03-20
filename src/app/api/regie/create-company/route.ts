import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/utils/auth'
import { prisma } from '@/lib/prisma/client'
import { slugify } from '@/lib/utils'
import type { ApiResponse } from '@/types'

const CreateCompanySchema = z.object({
  name: z.string().min(2),
  address: z.string().min(5),
  canton: z.enum([
    'AG','AI','AR','BE','BL','BS','FR','GE','GL','GR','JU','LU',
    'NE','NW','OW','SG','SH','SO','SZ','TG','TI','UR','VD','VS','ZG','ZH'
  ]),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  svitMembershipNumber: z.string().optional(),
  // Agent details
  firstName: z.string().min(1),
  lastName: z.string().min(1),
})

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  const user = await getAuthUser()
  if (!user || user.role !== 'AGENT') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  // Check agent doesn't already have a profile
  const existing = await prisma.agentProfile.findUnique({ where: { userId: user.id } })
  if (existing) {
    return NextResponse.json({ success: false, error: 'Already associated with a régie' }, { status: 409 })
  }

  const body = await req.json()
  const parsed = CreateCompanySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 })
  }

  const data = parsed.data
  let baseSlug = slugify(data.name)
  let slug = baseSlug
  let suffix = 1

  // Ensure unique slug
  while (await prisma.regie.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix++}`
  }

  const result = await prisma.$transaction(async (tx) => {
    const regie = await tx.regie.create({
      data: {
        name: data.name,
        slug,
        address: data.address,
        canton: data.canton as Parameters<typeof tx.regie.create>[0]['data']['canton'],
        phone: data.phone,
        email: data.email,
        website: data.website,
        svitMembershipNumber: data.svitMembershipNumber,
        hasAccount: true,
        isVerified: false,
      },
    })

    const agent = await tx.agentProfile.create({
      data: {
        userId: user.id,
        regieId: regie.id,
        firstName: data.firstName,
        lastName: data.lastName,
        isCompanyAdmin: true,
        isVerified: false,
      },
    })

    return { regie, agent }
  })

  return NextResponse.json({ success: true, data: result }, { status: 201 })
}
