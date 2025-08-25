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
