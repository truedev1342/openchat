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
