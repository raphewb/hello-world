import { createSupabaseServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'
import type { AuthUser } from '@/types'
import { NextResponse } from 'next/server'

export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
    include: {
      tenantProfile: true,
      agentProfile: true,
      landlordProfile: true,
    },
  })
  if (!dbUser) return null

  const profile =
    dbUser.tenantProfile ?? dbUser.agentProfile ?? dbUser.landlordProfile ?? null

  return {
    id: dbUser.id,
    email: dbUser.email,
    role: dbUser.role,
    profile,
  }
}

export function requireAuth(handler: (req: Request, user: AuthUser) => Promise<Response>) {
  return async (req: Request) => {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    return handler(req, user)
  }
}

export function requireRole(
  roles: AuthUser['role'][],
  handler: (req: Request, user: AuthUser) => Promise<Response>
) {
  return async (req: Request) => {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    if (!roles.includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    return handler(req, user)
  }
}

export async function getTenantProfile(userId: string) {
  return prisma.tenantProfile.findUnique({
    where: { userId },
    include: { documents: { where: { isCurrent: true } } },
  })
}

export async function getAgentProfile(userId: string) {
  return prisma.agentProfile.findUnique({
    where: { userId },
    include: { regie: true },
  })
}
