'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Loader2 } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Workspace, Channel } from '@/types/database'

interface WorkspaceSetupProps {
  onCreated: (workspace: Workspace) => void
}

export function WorkspaceSetup({ onCreated }: WorkspaceSetupProps) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const client = getSupabaseClient()
    if (!client || !name.trim()) return

    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await client.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const slug = name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')

      // Generate workspace ID client-side so we can reference it immediately
      const workspaceId = crypto.randomUUID()

      // Create workspace (no .select() — RLS SELECT policy requires membership first)
      const { error: wsError } = await client
        .from('workspaces')
        .insert({ id: workspaceId, name: name.trim(), slug })

      if (wsError) throw wsError

      // Add self as owner (must happen before any SELECT on workspaces)
      const { error: memberError } = await client.from('workspace_members').insert({
        workspace_id: workspaceId,
        profile_id: session.user.id,
        role: 'owner',
      })

      if (memberError) throw memberError

      // Now fetch workspace (SELECT policy works because we're a member)
      const { data: workspace, error: fetchError } = await client
        .from('workspaces')
        .select()
        .eq('id', workspaceId)
        .single()

      if (fetchError) throw fetchError

      // Create workspace settings
      await client.from('workspace_settings').insert({
        workspace_id: workspace.id,
      })

      // Create #general channel
      const { data: general } = await client
        .from('channels')
        .insert({
          workspace_id: workspace.id,
          name: 'general',
          description: 'General discussion',
          created_by: session.user.id,
        })
        .select()
        .single()

      if (general) {
        await client.from('channel_members').insert({
          channel_id: general.id,
          profile_id: session.user.id,
          role: 'admin',
        })
      }

      // Create #random channel
      const { data: random } = await client
        .from('channels')
        .insert({
          workspace_id: workspace.id,
          name: 'random',
          description: 'Random stuff and off-topic',
