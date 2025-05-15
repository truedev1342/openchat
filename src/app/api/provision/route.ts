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
