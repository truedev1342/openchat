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
