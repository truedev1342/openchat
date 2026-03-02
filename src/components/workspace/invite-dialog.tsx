'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, Mail, Check, Copy, Link2, Send, Key, AlertTriangle, Info } from 'lucide-react'
import { useAppStore } from '@/lib/store/app-store'
import { getSupabaseClient } from '@/lib/supabase/client'

interface InviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InviteDialog({ open, onOpenChange }: InviteDialogProps) {
  const { workspace } = useAppStore()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [hasServiceKey, setHasServiceKey] = useState<boolean | null>(null)
  const [serviceKey, setServiceKey] = useState('')
  const [savingKey, setSavingKey] = useState(false)
  const [needsRestart, setNeedsRestart] = useState(false)

  const inviteLink = typeof window !== 'undefined'
    ? `${window.location.origin}/auth?workspace=${workspace?.id}`
    : ''

  // Check if service key is configured
  useEffect(() => {
    if (open) {
      fetch('/api/setup')
        .then((r) => r.json())
        .then((data) => setHasServiceKey(data.hasServiceKey ?? false))
        .catch(() => setHasServiceKey(false))
    }
  }, [open])

  async function handleSaveServiceKey() {
    if (!serviceKey.trim()) return
    setSavingKey(true)
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceRoleKey: serviceKey.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setNeedsRestart(true)
      } else {
        setError(data.error || 'Failed to save')
      }
    } catch {
      setError('Failed to save service key')
    } finally {
      setSavingKey(false)
    }
  }

