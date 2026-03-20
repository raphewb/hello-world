import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/utils/auth'
import { prisma } from '@/lib/prisma/client'
import type { ApiResponse } from '@/types'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<null>>> {
  const user = await getAuthUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  await prisma.regie.update({
    where: { id },
    data: { isVerified: true, verificationMethod: 'MANUAL' },
  })

  // Mark all agents in this régie as verified
  await prisma.agentProfile.updateMany({
    where: { regieId: id },
    data: { isVerified: true },
  })

  return NextResponse.json({ success: true, data: null })
}
