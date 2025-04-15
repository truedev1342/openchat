'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, Loader2, Mail, Users, ArrowLeft, KeyRound } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'

type Mode = 'signin' | 'signup'
type View =
  | 'loading'
  | 'form'
  | 'email-confirmation'
  | 'complete-profile'
  | 'forgot-password'
  | 'reset-password'
  | 'reset-email-sent'

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const workspaceId = searchParams.get('workspace')

  const emailParam = searchParams.get('email')
  const isInviteFlow = !!(workspaceId && emailParam)

  const [mode, setMode] = useState<Mode>(workspaceId ? 'signup' : 'signin')
  const [view, setView] = useState<View>('loading')
  const [email, setEmail] = useState(emailParam || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState(emailParam ? emailParam.split('@')[0] : '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [workspaceName, setWorkspaceName] = useState<string | null>(null)
  const isManualSubmit = useRef(false)

  // On mount: detect invite/recovery tokens in the URL hash, then show correct view
  useEffect(() => {
    const client = getSupabaseClient()
    if (!client) {
      setView('form')
      return
    }

    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      // User came from a password reset link
      if (event === 'PASSWORD_RECOVERY') {
        setView('reset-password')
        return
      }

      // User came from an invite link — they're now signed in but need to set password + name
      if (event === 'SIGNED_IN' && session && !isManualSubmit.current) {
        // Check if this is a password recovery flow (PKCE fires SIGNED_IN instead of PASSWORD_RECOVERY)
        const params = new URLSearchParams(window.location.search)
        if (params.get('recovery') === 'true') {
          setView('reset-password')
          return
        }

        // Check if this is from an invite (workspace param + no password set yet)
        if (workspaceId) {
          const meta = session.user.user_metadata
          setDisplayName(meta?.display_name || session.user.email?.split('@')[0] || '')
          setEmail(session.user.email || '')
          setView('complete-profile')
          return
        }
        // If no workspace param but signed in from token, go to workspace
        router.push('/workspace')
        return
      }
    })

    // Handle PKCE code exchange (Supabase email links with ?code= parameter)
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    if (code) {
      client.auth.exchangeCodeForSession(code).catch((err) => {
        console.error('Code exchange failed:', err)
        setView('form')
      })
      // onAuthStateChange will fire SIGNED_IN after successful exchange
    }

    // Detect hash fragment tokens (#access_token=...&type=invite)
    // Supabase implicit flow puts tokens in the URL hash — the client auto-detects them
    // but it takes time (network roundtrip to verify), so we need a longer timeout
    const hash = window.location.hash
    const hasHashTokens = hash.includes('access_token=') || hash.includes('type=invite')

    // Manual fallback: if hash tokens exist but onAuthStateChange doesn't fire,
    // try to set the session explicitly from the hash fragment
    if (hasHashTokens && !code) {
      const hashParams = new URLSearchParams(hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      if (accessToken && refreshToken) {
