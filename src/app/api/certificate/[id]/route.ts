import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/utils/auth'
import { getCertificateData } from '@/services/certificates'
import { hashIpAddress } from '@/lib/utils'
import type { ApiResponse } from '@/types'
import { prisma } from '@/lib/prisma/client'

// Rate limiting: track by IP (simple in-memory for MVP; use Upstash in prod)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 60
const RATE_WINDOW = 60 * 1000 // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW })
    return true
  }

  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<unknown>>> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 })
  }

  const { id } = await params
  const user = await getAuthUser()

  // Build viewer context
  const viewer = user
    ? await buildViewerContext(user.id, user.role)
    : { userId: undefined, role: undefined, regieId: undefined, isVerified: false }

  const result = await getCertificateData(id, viewer)

  if (result.tier === 'expired') {
    return NextResponse.json({ success: false, error: 'Certificate expired', code: 'EXPIRED' }, { status: 410 })
  }
  if (result.tier === 'revoked') {
    return NextResponse.json({ success: false, error: 'Certificate revoked', code: 'REVOKED' }, { status: 410 })
  }

  return NextResponse.json({ success: true, data: result })
}

async function buildViewerContext(userId: string, role: string) {
  const agentProfile = role === 'AGENT'
    ? await prisma.agentProfile.findUnique({ where: { userId } })
    : null

  const landlordProfile = role === 'LANDLORD'
    ? await prisma.landlordProfile.findUnique({ where: { userId } })
    : null

  return {
    userId,
    role,
    regieId: agentProfile?.regieId,
    isVerified: agentProfile?.isVerified ?? landlordProfile?.verificationStatus === 'VERIFIED',
  }
}
