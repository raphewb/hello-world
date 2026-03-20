import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'
import type { ApiResponse } from '@/types'

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<{ role: string; redirectTo: string }>>> {
  try {
    const body = await req.json()
    const parsed = LoginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    })

    if (error || !data.user) {
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 })
    }

    // Update last login
    const user = await prisma.user.update({
      where: { email: data.user.email! },
      data: { lastLogin: new Date() },
    })

    const redirectMap: Record<string, string> = {
      TENANT: '/app/tenant/dashboard',
      AGENT: '/app/agent/dashboard',
      LANDLORD: '/app/landlord/dashboard',
      ADMIN: '/admin/dashboard',
    }

    return NextResponse.json({
      success: true,
      data: {
        role: user.role,
        redirectTo: redirectMap[user.role] ?? '/app/tenant/dashboard',
      },
    })
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Login failed' }, { status: 500 })
  }
}
