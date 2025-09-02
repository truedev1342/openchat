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

