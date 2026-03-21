import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/utils/auth'
import { prisma } from '@/lib/prisma/client'
import { recomputeTenantScores } from '@/services/trust-score'
import type { ApiResponse } from '@/types'

const Schema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<null>>> {
  const user = await getAuthUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 })
  }

  const doc = await prisma.document.findUnique({ where: { id }, include: { tenant: true } })
  if (!doc) return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 })

  await prisma.document.update({
    where: { id },
    data: {
      verificationStatus: parsed.data.action === 'approve' ? 'VERIFIED' : 'REJECTED',
      aiRejectionReason: parsed.data.action === 'reject' ? (parsed.data.reason ?? 'Rejected by admin after manual review.') : null,
      aiVerifiedAt: new Date(),
    },
  })

  await recomputeTenantScores(doc.tenantId)

  return NextResponse.json({ success: true, data: null })
}
