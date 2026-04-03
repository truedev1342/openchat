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

    const { data } = await client
      .from('incoming_webhooks')
      .select('*')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false })

    if (data) setWebhooks(data as IncomingWebhook[])
    setLoading(false)
  }

  async function createWebhook() {
    const client = getSupabaseClient()
    if (!client || !workspace || !user || !newName.trim() || !newChannel) return

    setCreating(true)
    try {
      const { data, error } = await client
        .from('incoming_webhooks')
        .insert({
          workspace_id: workspace.id,
          channel_id: newChannel,
          name: newName.trim(),
          display_name: newName.trim(),
          created_by: user.id,
        })
        .select()
        .single()

