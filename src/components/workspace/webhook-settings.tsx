'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store/app-store'
import { Plus, Copy, Trash2, Webhook, Check, ExternalLink } from 'lucide-react'
import type { IncomingWebhook, Channel } from '@/types/database'

export function WebhookSettings() {
  const { user, workspace, channels } = useAppStore()
  const [webhooks, setWebhooks] = useState<IncomingWebhook[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newChannel, setNewChannel] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    loadWebhooks()
  }, [workspace])

  async function loadWebhooks() {
    const client = getSupabaseClient()
    if (!client || !workspace) return

