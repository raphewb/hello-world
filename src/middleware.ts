import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Routes that require authentication by prefix
const PROTECTED_PREFIXES = ['/app/', '/admin/']

// Role-to-route mapping
const ROLE_ROUTES: Record<string, string[]> = {
  TENANT: ['/app/tenant/'],
  AGENT: ['/app/agent/'],
  LANDLORD: ['/app/landlord/'],
  ADMIN: ['/admin/'],
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Build Supabase server client for auth check
  let response = NextResponse.next({ request: req })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          response = NextResponse.next({ request: req })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))

  if (isProtected && !user) {
    const loginUrl = new URL('/auth/login', req.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // If logged in and hitting /auth/login or /auth/register, redirect to dashboard
  if (user && (pathname === '/auth/login' || pathname === '/auth/register')) {
    // We'd need the DB role for this — skip for now, handled client-side
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
