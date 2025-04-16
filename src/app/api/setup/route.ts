import { NextRequest, NextResponse } from 'next/server'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

// GET: Check if config exists
export async function GET() {
  const configured = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
  return NextResponse.json({ configured, hasServiceKey })
}

// POST: Write .env.local with Supabase config
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Setup API is only available in development mode. Set environment variables directly for production.' },
      { status: 403 }
    )
  }
