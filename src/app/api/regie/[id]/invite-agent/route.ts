import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/utils/auth'
import { prisma } from '@/lib/prisma/client'
import { nanoid } from 'nanoid'
import type { ApiResponse } from '@/types'

const InviteSchema = z.object({
  email: z.string().email(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<{ invitationId: string }>>> {
  const user = await getAuthUser()
  if (!user || user.role !== 'AGENT') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const agent = await prisma.agentProfile.findUnique({ where: { userId: user.id } })
  if (!agent || agent.regieId !== id || !agent.isCompanyAdmin) {
    return NextResponse.json({ success: false, error: 'Forbidden — admin only' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = InviteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid email' }, { status: 400 })
  }

  const token = nanoid(32)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const invitation = await prisma.agentInvitation.create({
    data: {
      regieId: id,
      invitedBy: agent.id,
      email: parsed.data.email,
      token,
      expiresAt,
    },
  })

  const regie = await prisma.regie.findUnique({ where: { id } })

  // Send invitation email
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://swisstrust.ch'
  const { sendAgentInvitation } = await import('@/lib/email')
  sendAgentInvitation(
    parsed.data.email,
    `${agent.firstName} ${agent.lastName}`,
    regie?.name ?? 'Your company',
    `${appUrl}/auth/invite/${token}`,
    expiresAt
  ).catch(console.error)

  return NextResponse.json({ success: true, data: { invitationId: invitation.id } }, { status: 201 })
}
