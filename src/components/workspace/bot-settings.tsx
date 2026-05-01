'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store/app-store'
import { Plus, Copy, Trash2, Bot as BotIcon, Check, Key } from 'lucide-react'
import type { Bot } from '@/types/database'

export function BotSettings() {
  const { user, workspace } = useAppStore()
  const [bots, setBots] = useState<Bot[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showToken, setShowToken] = useState<string | null>(null)

  useEffect(() => {
    loadBots()
  }, [workspace])

  async function loadBots() {
    const client = getSupabaseClient()
    if (!client || !workspace) return

    const { data } = await client
      .from('bots')
      .select('*')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false })

    if (data) setBots(data as Bot[])
    setLoading(false)
  }

  async function createBot() {
    const client = getSupabaseClient()
    if (!client || !workspace || !user || !newName.trim()) return

    setCreating(true)
    try {
      const { data, error } = await client
        .from('bots')
        .insert({
          workspace_id: workspace.id,
          name: newName.trim().toLowerCase().replace(/\s+/g, '-'),
          display_name: newName.trim(),
          description: newDescription.trim() || null,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) throw error
      if (data) {
        setBots(prev => [data as Bot, ...prev])
        setNewName('')
        setNewDescription('')
      }
    } catch (err) {
      console.error('Failed to create bot:', err)
    }
    setCreating(false)
  }

  async function deleteBot(id: string) {
    const client = getSupabaseClient()
    if (!client) return

    await client.from('bots').delete().eq('id', id)
    setBots(prev => prev.filter(b => b.id !== id))
  }

  function copyToken(bot: Bot) {
    navigator.clipboard.writeText(bot.bot_token)
    setCopiedId(bot.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-1" style={{ color: '#2D2B3D' }}>Bots</h3>
        <p className="text-xs" style={{ color: '#8E8EA0' }}>
          Create bots that can send messages and respond to events.
        </p>
      </div>

      {/* Create new bot */}
      <div className="p-4 rounded-xl border" style={{ borderColor: '#E5E1EE', background: '#F5F2FF' }}>
        <p className="text-xs font-medium mb-3" style={{ color: '#4A4860' }}>Create new bot</p>
        <div className="space-y-2">
          <Input
            placeholder="Bot name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Input
            placeholder="Description (optional)"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
