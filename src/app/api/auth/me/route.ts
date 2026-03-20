import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/utils/auth'
import type { ApiResponse, AuthUser } from '@/types'

export async function GET(): Promise<NextResponse<ApiResponse<AuthUser>>> {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json({ success: true, data: user })
}
