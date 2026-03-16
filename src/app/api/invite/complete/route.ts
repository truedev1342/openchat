import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/invite/complete
 * Fallback for completing the invite flow when hash fragment session doesn't work.
 * Uses admin API to create/update the user and add them to the workspace.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password, displayName, workspaceId } = await request.json()

    if (!email || !password || !workspaceId) {
      return NextResponse.json(
        { error: 'Missing email, password, or workspaceId' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
