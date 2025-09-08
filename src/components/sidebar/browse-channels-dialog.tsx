'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store/app-store'
import { Hash, Search, Users, Loader2, Check } from 'lucide-react'
import type { Channel } from '@/types/database'

interface BrowseChannelsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ChannelWithInfo extends Channel {
  memberCount: number
  isMember: boolean
}

export function BrowseChannelsDialog({ open, onOpenChange }: BrowseChannelsDialogProps) {
  const { user, workspace, setCurrentChannelId, setPreviewChannel, addChannel } = useAppStore()
  const [allChannels, setAllChannels] = useState<ChannelWithInfo[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [joiningId, setJoiningId] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !workspace || !user) return
    loadChannels()
  }, [open, workspace, user])

  useEffect(() => {
    if (!open) {
      setSearch('')
    }
  }, [open])

  async function loadChannels() {
    const client = getSupabaseClient()
    if (!client || !workspace || !user) return

    setLoading(true)

    // Load all public non-DM channels
    const { data: chans } = await client
      .from('channels')
      .select('*')
      .eq('workspace_id', workspace.id)
      .eq('is_private', false)
      .eq('is_archived', false)
      .not('name', 'like', 'dm-%')
      .order('name')

    if (!chans) {
      setLoading(false)
      return
    }

    // Get user's memberships
    const { data: memberships } = await client
      .from('channel_members')
      .select('channel_id')
      .eq('profile_id', user.id)

    const memberChannelIds = new Set(memberships?.map((m) => m.channel_id) || [])

    // Get member counts for all channels
    const channelIds = chans.map((c) => c.id)
    const { data: memberCounts } = await client
      .from('channel_members')
      .select('channel_id')
      .in('channel_id', channelIds)

    const countMap = new Map<string, number>()
    memberCounts?.forEach((m) => {
      countMap.set(m.channel_id, (countMap.get(m.channel_id) || 0) + 1)
    })

    const withInfo: ChannelWithInfo[] = chans.map((c) => ({
      ...(c as Channel),
      memberCount: countMap.get(c.id) || 0,
      isMember: memberChannelIds.has(c.id),
    }))

    setAllChannels(withInfo)
    setLoading(false)
  }

