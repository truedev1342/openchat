'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store/app-store'
import { Search, Hash, Lock, MessageSquare, User, Loader2, ArrowRight, Clock, Sparkles } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Channel, Message, Profile } from '@/types/database'

interface SearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Result =
  | { type: 'channel'; channel: Channel }
  | { type: 'message'; message: Message & { sender?: Profile; channel_name?: string } }
  | { type: 'user'; user: Profile }

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const { workspace, user, channels, dmChannels, setCurrentChannelId, setPreviewChannel, openProfile } = useAppStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const search = useCallback(
    async (q: string) => {
      const client = getSupabaseClient()
      if (!client || !workspace || !user || !q.trim()) {
        setResults([])
        return
      }

      setLoading(true)
      const all: Result[] = []

      try {
        const { data: myMemberships } = await client
          .from('channel_members')
          .select('channel_id')
          .eq('profile_id', user.id)

        const myChannelIds = new Set(myMemberships?.map((m) => m.channel_id) || [])

        // Search channels
        const { data: channelsData } = await client
          .from('channels')
          .select('*')
          .eq('workspace_id', workspace.id)
          .eq('is_archived', false)
          .not('name', 'like', 'dm-%')
          .ilike('name', `%${q}%`)
          .limit(10)

        if (channelsData) {
          channelsData
            .filter((c) => !c.is_private || myChannelIds.has(c.id))
