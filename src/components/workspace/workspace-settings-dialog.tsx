'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Loader2,
  Settings,
  Circle,
  Crown,
  Shield,
  ShieldCheck,
  UserMinus,
  Check,
  X,
  UserX,
  Video,
  ExternalLink,
  Webhook,
  Bot,
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store/app-store'
import { WebhookSettings } from './webhook-settings'
import { BotSettings } from './bot-settings'
import type { Profile, WorkspaceSettings } from '@/types/database'

interface WorkspaceSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface MemberWithRole {
  profile: Profile
  role: 'owner' | 'admin' | 'member'
}

interface LiveKitConfig {
  livekit_url: string
  livekit_api_key: string
  livekit_api_secret: string
  calls_enabled: boolean
}

export function WorkspaceSettingsDialog({ open, onOpenChange }: WorkspaceSettingsDialogProps) {
  const { user, workspace, workspaceRole, setWorkspace } = useAppStore()
  const [members, setMembers] = useState<MemberWithRole[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Tabs
  const [activeTab, setActiveTab] = useState<'general' | 'webhooks' | 'bots'>('general')

  // Confirm remove member
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)

  // LiveKit config
  const [livekitConfig, setLivekitConfig] = useState<LiveKitConfig>({
    livekit_url: '',
    livekit_api_key: '',
    livekit_api_secret: '',
    calls_enabled: false,
  })
  const [savingLivekit, setSavingLivekit] = useState(false)
  const [livekitSaved, setLivekitSaved] = useState(false)

  const isAdmin = workspaceRole === 'admin' || workspaceRole === 'owner'
  const isOwner = workspaceRole === 'owner'

  useEffect(() => {
    if (!open) {
      setSearch('')
      setConfirmRemoveId(null)
      setActiveTab('general')
      return
    }
    loadMembers()
    loadLivekitConfig()
  }, [open])

  async function loadMembers() {
    const client = getSupabaseClient()
    if (!client || !workspace) return

    setLoading(true)
    const { data } = await client
      .from('workspace_members')
      .select('profile_id, role, profile:profiles(*)')
      .eq('workspace_id', workspace.id)

    if (data) {
      const mems = data
        .map((d) => ({
          profile: d.profile as unknown as Profile,
          role: d.role as 'owner' | 'admin' | 'member',
        }))
        .filter((m) => m.profile)
        .sort((a, b) => {
          const order = { owner: 0, admin: 1, member: 2 }
          return order[a.role] - order[b.role] || a.profile.display_name.localeCompare(b.profile.display_name)
        })

      setMembers(mems)
    }
    setLoading(false)
  }

  async function loadLivekitConfig() {
    const client = getSupabaseClient()
    if (!client || !workspace) return

    const { data } = await client
      .from('workspace_settings')
      .select('*')
      .eq('workspace_id', workspace.id)
      .single()

    if (data) {
      setLivekitConfig({
        livekit_url: data.livekit_url || '',
        livekit_api_key: data.livekit_api_key || '',
        livekit_api_secret: data.livekit_api_secret || '',
        calls_enabled: data.calls_enabled || false,
      })
    }
  }

  async function saveLivekitConfig() {
    const client = getSupabaseClient()
    if (!client || !workspace) return

    setSavingLivekit(true)
    setLivekitSaved(false)

    try {
      // Upsert workspace_settings
      const { error } = await client
        .from('workspace_settings')
        .upsert({
          workspace_id: workspace.id,
          livekit_url: livekitConfig.livekit_url || null,
          livekit_api_key: livekitConfig.livekit_api_key || null,
          livekit_api_secret: livekitConfig.livekit_api_secret || null,
          calls_enabled: livekitConfig.calls_enabled,
        })

      if (error) throw error
      setLivekitSaved(true)
      setTimeout(() => setLivekitSaved(false), 2000)
    } catch (err) {
      console.error('Failed to save LiveKit config:', err)
    }
    setSavingLivekit(false)
  }

  async function handleChangeRole(profileId: string, newRole: 'admin' | 'member') {
    const client = getSupabaseClient()
    if (!client || !workspace) return

    try {
      await client
        .from('workspace_members')
        .update({ role: newRole })
        .eq('workspace_id', workspace.id)
        .eq('profile_id', profileId)

      setMembers((prev) =>
        prev.map((m) =>
          m.profile.id === profileId ? { ...m, role: newRole } : m
        )
      )
    } catch (err) {
      console.error('Failed to change role:', err)
    }
  }

  async function handleRemoveMember(profileId: string) {
    const client = getSupabaseClient()
    if (!client || !workspace) return

    setRemoving(true)
    try {
      // Remove from all channels in this workspace
      const { data: channels } = await client
        .from('channels')
        .select('id')
        .eq('workspace_id', workspace.id)

      if (channels) {
        for (const ch of channels) {
          await client
            .from('channel_members')
            .delete()
            .eq('channel_id', ch.id)
            .eq('profile_id', profileId)
        }
      }

      // Remove from workspace
      await client
        .from('workspace_members')
        .delete()
        .eq('workspace_id', workspace.id)
        .eq('profile_id', profileId)

      setMembers((prev) => prev.filter((m) => m.profile.id !== profileId))
      setConfirmRemoveId(null)
    } catch (err) {
      console.error('Failed to remove member:', err)
    }
