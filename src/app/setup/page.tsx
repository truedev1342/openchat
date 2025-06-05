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
