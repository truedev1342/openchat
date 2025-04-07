import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // Public routes that don't need auth
  const publicPaths = ['/auth', '/setup', '/api/setup', '/api/provision', '/_next', '/favicon.ico']
  const path = request.nextUrl.pathname

  if (publicPaths.some(p => path.startsWith(p)) || path === '/') {
    return NextResponse.next()
  }

  // Create a response to potentially modify cookies
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(new URL('/setup', request.url))
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
