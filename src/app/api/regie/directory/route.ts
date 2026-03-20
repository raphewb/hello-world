import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import type { ApiResponse, RegieSearchResult } from '@/types'

export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<RegieSearchResult[]>>> {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()

  if (!q || q.length < 2) {
    return NextResponse.json({ success: true, data: [] })
  }

  const regies = await prisma.regie.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { address: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      address: true,
      canton: true,
      email: true,
      hasAccount: true,
      isVerified: true,
      logoUrl: true,
    },
    take: 10,
    orderBy: [{ hasAccount: 'desc' }, { isVerified: 'desc' }, { name: 'asc' }],
  })

  return NextResponse.json({ success: true, data: regies as RegieSearchResult[] })
}
