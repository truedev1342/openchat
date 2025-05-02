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
        client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).catch((err) => {
          console.error('Manual session set from hash failed:', err)
        })
        // onAuthStateChange will fire SIGNED_IN after successful setSession
      }
    }

    // If no auth event fires quickly, show the normal form
    // Use longer timeout when we have a code or hash tokens to process (needs network roundtrip)
    const needsAuthProcessing = !!code || hasHashTokens
    const timeout = setTimeout(() => {
      setView((current) => (current === 'loading' ? 'form' : current))
    }, needsAuthProcessing ? 5000 : 500)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [workspaceId, router])

  // Fetch workspace name for invite banner
  useEffect(() => {
    if (!workspaceId) return
    const client = getSupabaseClient()
    if (!client) return

    client
      .from('workspaces')
      .select('name')
      .eq('id', workspaceId)
      .single()
      .then(({ data }) => {
        if (data) setWorkspaceName(data.name)
      })
  }, [workspaceId])

  async function autoJoinWorkspace(userId: string) {
    if (!workspaceId) return
    const client = getSupabaseClient()
    if (!client) return

    try {
      const { data: existing } = await client
        .from('workspace_members')
        .select('profile_id')
        .eq('workspace_id', workspaceId)
        .eq('profile_id', userId)
        .limit(1)

      if (existing && existing.length > 0) return

      await client.from('workspace_members').insert({
        workspace_id: workspaceId,
        profile_id: userId,
        role: 'member',
      })

      const { data: channels } = await client
        .from('channels')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('is_private', false)

      if (channels) {
        for (const ch of channels) {
          await client
            .from('channel_members')
            .insert({ channel_id: ch.id, profile_id: userId })
            .then(() => {})
        }
      }
    } catch (err) {
      console.error('Auto-join failed:', err)
    }
  }

  // ---- Complete profile (invite flow) ----
  async function handleCompleteProfile(e: React.FormEvent) {
    e.preventDefault()
    const client = getSupabaseClient()
    if (!client) return

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Set password and display name
      const { error: updateError } = await client.auth.updateUser({
        password,
        data: { display_name: displayName || email.split('@')[0] },
      })
      if (updateError) throw updateError

      // Update profile table too
      const { data: { user } } = await client.auth.getUser()
      if (user) {
        await client
          .from('profiles')
          .update({ display_name: displayName || email.split('@')[0] })
          .eq('id', user.id)

        await autoJoinWorkspace(user.id)
      }

      router.push('/workspace')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete profile')
    } finally {
      setLoading(false)
    }
  }

  // ---- Forgot password ----
  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    const client = getSupabaseClient()
    if (!client || !email) return

    setLoading(true)
    setError(null)

    try {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?recovery=true`,
      })
      if (error) throw error
      setView('reset-email-sent')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  // ---- Reset password (from email link) ----
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    const client = getSupabaseClient()
    if (!client) return

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error } = await client.auth.updateUser({ password })
      if (error) throw error
      router.push('/workspace')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  // ---- Complete invite (server-side password set + workspace join) ----
  async function handleInviteComplete(e: React.FormEvent) {
    e.preventDefault()
    const client = getSupabaseClient()
    if (!client || !workspaceId) return

    setLoading(true)
    setError(null)

    try {
      // Use server endpoint to set password via admin API (no email confirmation needed)
      const res = await fetch('/api/invite/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          displayName: displayName || email.split('@')[0],
          workspaceId,
        }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to complete invite')

      // Now sign in with the password we just set
      const { error: signInError } = await client.auth.signInWithPassword({
        email,
        password,
      })
      if (signInError) throw signInError

      router.push('/workspace')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join workspace')
    } finally {
      setLoading(false)
    }
  }

  // ---- Normal sign in / sign up ----
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const client = getSupabaseClient()
    if (!client) return

    isManualSubmit.current = true
    setLoading(true)
    setError(null)

    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await client.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName || email.split('@')[0] },
          },
        })

        if (signUpError) throw signUpError

        if (!data.session) {
          // For invited users, their email is already confirmed via the invite link.
          // signUp returns no session because the user already exists — try signing in instead.
          if (workspaceId) {
            const { data: signInData, error: signInError } =
              await client.auth.signInWithPassword({ email, password })
            if (!signInError && signInData.user) {
              await autoJoinWorkspace(signInData.user.id)
              router.push('/workspace')
              return
            }
          }
          setView('email-confirmation')
          setLoading(false)
          isManualSubmit.current = false
          return
        }

        if (data.session.user) {
          await autoJoinWorkspace(data.session.user.id)
        }
      } else {
        const { data, error: signInError } = await client.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError

        if (data.user) {
          await autoJoinWorkspace(data.user.id)
        }
      }

      router.push('/workspace')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
      isManualSubmit.current = false
    }
  }

  // ---- Error banner ----
  const errorBanner = error && (
    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
      <p className="text-sm text-destructive">{error}</p>
    </div>
  )

  // ---- Invite banner ----
  const inviteBanner = workspaceId && (
    <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-md flex items-center gap-2">
      <Users className="h-5 w-5 text-primary shrink-0" />
      <p className="text-sm">
        You&apos;ve been invited to join{' '}
        <strong>{workspaceName || 'a workspace'}</strong>!
      </p>
    </div>
  )

  // ===== LOADING =====
  if (view === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // ===== COMPLETE PROFILE (invite) =====
  if (view === 'complete-profile') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <CardHeader className="text-center">
            <Users className="mx-auto h-10 w-10 text-primary mb-2" />
            <CardTitle className="text-2xl">Complete your profile</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Set your name and password to join{' '}
              <strong>{workspaceName || 'the workspace'}</strong>
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCompleteProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-display">Email</Label>
                <Input
                  id="email-display"
                  type="email"
                  value={email}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Choose a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              {errorBanner}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Join Workspace'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ===== RESET PASSWORD (from email link) =====
  if (view === 'reset-password') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <CardHeader className="text-center">
            <KeyRound className="mx-auto h-10 w-10 text-primary mb-2" />
            <CardTitle className="text-2xl">Reset your password</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Enter your new password below.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                <Input
                  id="confirm-new-password"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
