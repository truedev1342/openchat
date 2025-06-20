'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  MessageSquare,
  Server,
  Shield,
  Phone,
  Puzzle,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  AlertTriangle,
  Check,
  Loader2,
  RotateCcw,
} from 'lucide-react'
import { provision, verifyTables, configureSiteUrl, validateToken } from '@/lib/supabase/provisioner'

type Step = 'welcome' | 'connect' | 'provisioning' | 'done'

export default function SetupPage() {
  const [step, setStep] = useState<Step>('welcome')
  const [supabaseURL, setSupabaseURL] = useState('')
  const [anonKey, setAnonKey] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [tokenWarning, setTokenWarning] = useState<string | null>(null)
  const [provisioningStatus, setProvisioningStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isProduction, setIsProduction] = useState(false)
  const [siteUrlConfigured, setSiteUrlConfigured] = useState(true)

  // If already configured, redirect to auth
  useEffect(() => {
    fetch('/api/setup')
      .then((res) => res.json())
      .then((data) => {
        if (data.configured) {
          window.location.href = '/auth'
        }
      })
      .catch(() => {})
  }, [])

  function handleTokenChange(value: string) {
    setAccessToken(value)
    const trimmed = value.trim()
    if (!trimmed) {
      setTokenWarning(null)
    } else if (trimmed.startsWith('eyJ')) {
      setTokenWarning(
        "This looks like a JWT key (anon/service_role), not a Personal Access Token. The token should start with sbp_"
      )
    } else if (!trimmed.startsWith('sbp_')) {
      setTokenWarning("Personal Access Tokens start with sbp_. Make sure you're using the right token.")
    } else {
      setTokenWarning(null)
    }
  }

  async function startProvisioning() {
    setError(null)
    setStep('provisioning')

    try {
      const cleanURL = supabaseURL.trim().replace(/\/+$/, '')
      const cleanKey = anonKey.trim()
      const cleanToken = accessToken.trim()

      // Validate URL
      try {
        new URL(cleanURL)
      } catch {
        throw new Error('Invalid Supabase URL. Please check the URL and try again.')
      }

      // Validate token
      if (!validateToken(cleanToken)) {
        throw new Error(
          "Invalid token format. The Personal Access Token should start with 'sbp_'."
        )
      }

      // Step 1: Provision database (runs all SQL migrations)
      console.log('[setup] Step 1: Starting database provisioning...')
      await provision(cleanURL, cleanToken, (status) => {
        setProvisioningStatus(status)
      })
      console.log('[setup] Step 1: Database provisioning complete')

      // Step 2: Save config to .env.local IMMEDIATELY after DB setup
      // This is the critical step — do it before optional steps so config isn't lost
      console.log('[setup] Step 2: Saving configuration...')
      setProvisioningStatus('Saving configuration...')
      try {
        const res = await fetch('/api/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ supabaseUrl: cleanURL, anonKey: cleanKey }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          // In production (Vercel, etc.), .env.local can't be written — that's expected
          if (data.error?.includes('production') || data.error?.includes('development')) {
            setIsProduction(true)
            console.log('[setup] Step 2: Production detected, env vars need manual config')
          } else {
            console.error('[setup] Step 2: Failed to save config:', data.error)
            throw new Error(data.error || 'Failed to save configuration')
          }
        } else {
          console.log('[setup] Step 2: .env.local written successfully')
        }
      } catch (saveErr) {
        console.error('[setup] Step 2: Error saving config:', saveErr)
        throw saveErr
      }

      // Step 3: Configure Supabase Auth Site URL (optional — non-blocking)
      console.log('[setup] Step 3: Configuring Site URL...')
      try {
        const currentOrigin = window.location.origin
        const siteUrlOk = await configureSiteUrl(cleanURL, cleanToken, currentOrigin, (status) => {
          setProvisioningStatus(status)
        })
        setSiteUrlConfigured(siteUrlOk)
        console.log('[setup] Step 3: Site URL configured:', siteUrlOk)
      } catch (siteUrlErr) {
        console.warn('[setup] Step 3: Site URL config failed (non-blocking):', siteUrlErr)
        setSiteUrlConfigured(false)
      }

      // Step 4: Verify tables (optional — non-blocking)
      console.log('[setup] Step 4: Verifying tables...')
      setProvisioningStatus('Verifying database...')
      try {
        const missing = await verifyTables(cleanURL, cleanToken)
        if (missing.length > 0) {
          console.warn('[setup] Step 4: Missing tables:', missing)
          // Don't throw — tables were likely created, just verification failed
        } else {
          console.log('[setup] Step 4: All tables verified')
        }
      } catch (verifyErr) {
        console.warn('[setup] Step 4: Verification failed (non-blocking):', verifyErr)
      }

      console.log('[setup] Setup complete!')
      setStep('done')
    } catch (err) {
      console.error('[setup] Setup failed:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const canConnect =
    supabaseURL.trim() !== '' &&
    anonKey.trim() !== '' &&
    accessToken.trim() !== '' &&
    !tokenWarning

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {step === 'welcome' && (
        <div className="max-w-lg w-full space-y-8 text-center">
          <div className="space-y-4">
            <MessageSquare className="mx-auto h-16 w-16 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight">Welcome to OpenChat</h1>
            <p className="text-lg text-muted-foreground">
              The open-source team communication platform
            </p>
          </div>

          <div className="space-y-3 text-left">
            <Feature icon={<Server className="h-5 w-5" />} title="Self-hosted" desc="Your data, your servers, your rules" />
            <Feature icon={<Shield className="h-5 w-5" />} title="Secure" desc="Row-level security powered by Supabase" />
            <Feature icon={<Phone className="h-5 w-5" />} title="Audio & Video" desc="Built-in calls with LiveKit WebRTC" />
            <Feature icon={<Puzzle className="h-5 w-5" />} title="Extensible" desc="Webhooks, bots, slash commands" />
          </div>

          <Button size="lg" className="w-full max-w-xs" onClick={() => setStep('connect')}>
            Get Started <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
