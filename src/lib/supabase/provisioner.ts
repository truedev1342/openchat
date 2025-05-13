import { migrations, REQUIRED_TABLES } from './migrations'

export type ProgressCallback = (status: string) => void

export function validateToken(token: string): boolean {
  const trimmed = token.trim()
  return trimmed.startsWith('sbp_') && trimmed.length > 10
}

export function extractProjectRef(supabaseURL: string): string | null {
  try {
    const url = new URL(supabaseURL)
    const parts = url.hostname.split('.')
    if (parts.length >= 2 && parts[1] === 'supabase') {
      return parts[0]
    }
    return null
  } catch {
    return null
  }
}

async function executeSQL(
  projectRef: string,
  accessToken: string,
  sql: string,
  readOnly: boolean = false
): Promise<unknown> {
  // Call our server-side API route to avoid CORS issues with Supabase Management API
  const response = await fetch('/api/provision', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ projectRef, accessToken, sql, readOnly }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
    const message = data.error || `HTTP ${response.status}`

    if (
      message.includes('JWT') ||
      message.includes('token') ||
      message.includes('unauthorized')
    ) {
      throw new Error(
        `Connection failed: ${message}. Make sure you're using a Personal Access Token (starts with sbp_) from supabase.com/dashboard/account/tokens`
      )
    }
    throw new Error(`Supabase API error: ${message}`)
  }

  // Some SQL commands return empty responses — handle gracefully
  const text = await response.text()
