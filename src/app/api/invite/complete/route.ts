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
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Service role key not configured. Ask your workspace admin to set SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    let userId: string | null = null

    // Strategy 1: Try to create the user directly (works if invite user doesn't exist yet)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName || email.split('@')[0],
        workspace_id: workspaceId,
      },
    })

    if (newUser?.user) {
      userId = newUser.user.id
    } else if (createError) {
      // User already exists (from inviteUserByEmail) — find and update them
      console.log('[invite-complete] User exists, looking up to update:', createError.message)

      // Find user by listing (with error handling)
      const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      })

      if (listError) {
        console.error('[invite-complete] listUsers failed:', listError)
        return NextResponse.json(
          { error: `Admin API error: ${listError.message}. Check SUPABASE_SERVICE_ROLE_KEY.` },
          { status: 500 }
        )
      }

      const existingUser = usersData?.users.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      )

      if (!existingUser) {
        return NextResponse.json(
          { error: 'Could not find user account. Please try again or contact workspace admin.' },
          { status: 404 }
