import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/utils/auth'
import { prisma } from '@/lib/prisma/client'
import type { ApiResponse } from '@/types'

export async function GET(): Promise<NextResponse<ApiResponse<unknown>>> {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json({ success: true, data: notifications })
}

export async function PATCH(req: NextRequest): Promise<NextResponse<ApiResponse<null>>> {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { ids } = await req.json()
  if (!Array.isArray(ids)) {
    return NextResponse.json({ success: false, error: 'ids must be an array' }, { status: 400 })
  }

  await prisma.notification.updateMany({
    where: { id: { in: ids }, userId: user.id },
    data: { isRead: true },
  })

  return NextResponse.json({ success: true, data: null })
}
