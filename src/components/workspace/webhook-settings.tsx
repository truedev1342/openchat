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

      if (error) throw error
      if (data) {
        setWebhooks(prev => [data as IncomingWebhook, ...prev])
        setNewName('')
        setNewChannel('')
      }
    } catch (err) {
      console.error('Failed to create webhook:', err)
    }
    setCreating(false)
  }

  async function deleteWebhook(id: string) {
    const client = getSupabaseClient()
    if (!client) return

    await client.from('incoming_webhooks').delete().eq('id', id)
    setWebhooks(prev => prev.filter(w => w.id !== id))
  }

  function copyWebhookUrl(webhook: IncomingWebhook) {
    const url = `${window.location.origin}/api/webhook/${webhook.id}`
    navigator.clipboard.writeText(url)
    setCopiedId(webhook.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const nonDmChannels = channels.filter(c => !c.name.startsWith('dm-') && !c.name.startsWith('gdm-'))

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-1" style={{ color: '#2D2B3D' }}>Incoming Webhooks</h3>
        <p className="text-xs" style={{ color: '#8E8EA0' }}>
          Send messages to channels from external services via HTTP POST.
        </p>
      </div>

      {/* Create new webhook */}
      <div className="p-4 rounded-xl border" style={{ borderColor: '#E5E1EE', background: '#F5F2FF' }}>
        <p className="text-xs font-medium mb-3" style={{ color: '#4A4860' }}>Create new webhook</p>
        <div className="flex gap-2">
          <Input
            placeholder="Webhook name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1"
          />
          <select
            value={newChannel}
            onChange={(e) => setNewChannel(e.target.value)}
            className="h-9 rounded-md border px-3 text-sm bg-white"
            style={{ borderColor: '#E5E1EE', color: '#2D2B3D' }}
          >
            <option value="">Select channel</option>
            {nonDmChannels.map(ch => (
              <option key={ch.id} value={ch.id}>#{ch.name}</option>
            ))}
          </select>
          <Button
            onClick={createWebhook}
            disabled={!newName.trim() || !newChannel || creating}
            size="sm"
            style={{ background: '#7C5CFC', color: '#fff' }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Create
          </Button>
        </div>
      </div>

      {/* Webhook list */}
      {loading ? (
        <p className="text-sm text-center py-4" style={{ color: '#8E8EA0' }}>Loading...</p>
      ) : webhooks.length === 0 ? (
        <div className="text-center py-8">
          <Webhook className="h-8 w-8 mx-auto mb-2" style={{ color: '#DDD6F3' }} />
          <p className="text-sm" style={{ color: '#8E8EA0' }}>No webhooks yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {webhooks.map(webhook => {
