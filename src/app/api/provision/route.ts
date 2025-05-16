import { NextRequest, NextResponse } from 'next/server'

function validatePAT(token: string): string | null {
  const trimmed = token.trim()
  if (!trimmed.startsWith('sbp_') || trimmed.length < 10) {
    return "Invalid token format. Personal Access Token should start with 'sbp_'"
  }
  return null
}

export async function POST(req: NextRequest) {
  // NOTE: This endpoint requires a valid Supabase Personal Access Token (sbp_...)
  // which already grants full admin access to the project — so no additional
  // production guard is needed. The PAT itself is the security boundary.

  try {
    const body = await req.json()
    const { projectRef, accessToken } = body

    // Validate common fields
    if (!projectRef || !accessToken) {
      return NextResponse.json(
        { error: 'Missing required fields: projectRef, accessToken' },
        { status: 400 }
      )
    }

    const trimmedToken = accessToken.trim()
    const tokenError = validatePAT(trimmedToken)
    if (tokenError) {
      return NextResponse.json({ error: tokenError }, { status: 400 })
    }

    // Route to the right handler based on action type
    if (body.action === 'update_auth_config') {
      return handleAuthConfig(projectRef, trimmedToken, body)
    }

    // Default: SQL query execution
    return handleSQL(projectRef, trimmedToken, body)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function handleSQL(
  projectRef: string,
  accessToken: string,
  body: { sql?: string; readOnly?: boolean }
) {
