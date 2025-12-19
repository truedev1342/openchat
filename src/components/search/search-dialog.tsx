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
            .slice(0, 5)
            .forEach((c) => all.push({ type: 'channel', channel: c as Channel }))
        }

        // Search users
        const { data: members } = await client
          .from('workspace_members')
          .select('profile:profiles(*)')
          .eq('workspace_id', workspace.id)

        if (members) {
          const profiles = members
            .map((m: Record<string, unknown>) => m.profile as Profile)
            .filter(
              (p) =>
                p &&
                (p.display_name.toLowerCase().includes(q.toLowerCase()) ||
                  p.email?.toLowerCase().includes(q.toLowerCase()))
            )
            .slice(0, 5)

          profiles.forEach((u) => all.push({ type: 'user', user: u }))
        }

        // Search messages
        if (myChannelIds.size > 0) {
          const { data: messages } = await client
            .from('messages')
            .select('*, sender:profiles(*)')
            .eq('is_deleted', false)
            .in('channel_id', [...myChannelIds])
            .ilike('content', `%${q}%`)
            .order('created_at', { ascending: false })
            .limit(10)

          if (messages) {
            const channelIds = [...new Set(messages.map((m) => m.channel_id))]
            const { data: channelData } = await client
              .from('channels')
              .select('id, name, is_private')
              .in('id', channelIds)

            const channelMap = new Map(channelData?.map((c) => [c.id, c.name]) || [])

            messages.forEach((m) =>
              all.push({
                type: 'message',
                message: { ...m, channel_name: channelMap.get(m.channel_id) || 'unknown' } as Message & { sender?: Profile; channel_name?: string },
              })
            )
          }
        }
      } catch (err) {
        console.error('Search error:', err)
      }

      setResults(all)
      setActiveIndex(-1)
      setLoading(false)
    },
    [workspace, user]
  )

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const timeout = setTimeout(() => search(query), 300)
    return () => clearTimeout(timeout)
  }, [query, search])

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults([])
      setActiveIndex(-1)
    }
  }, [open])

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    const flatResults = results
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => (prev < flatResults.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : flatResults.length - 1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      const r = flatResults[activeIndex]
      if (r.type === 'channel') handleSelectChannel(r.channel)
      else if (r.type === 'user') handleSelectUser(r.user.id)
      else if (r.type === 'message') handleSelectMessage(r.message.channel_id)
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && resultsRef.current) {
      const el = resultsRef.current.querySelector(`[data-index="${activeIndex}"]`)
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  function handleSelectChannel(channel: Channel) {
    const isMember =
      channels.some((c) => c.id === channel.id) ||
      dmChannels.some((c) => c.id === channel.id)

    if (isMember) {
      setCurrentChannelId(channel.id)
    } else {
      setPreviewChannel(channel)
    }
    onOpenChange(false)
  }

  function handleSelectUser(userId: string) {
    openProfile(userId)
    onOpenChange(false)
  }

  function handleSelectMessage(channelId: string) {
    setCurrentChannelId(channelId)
    onOpenChange(false)
  }

  // Highlight matching text
  function highlightMatch(text: string, q: string) {
    if (!q.trim()) return text
    const idx = text.toLowerCase().indexOf(q.toLowerCase())
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <span className="bg-primary/15 text-primary font-semibold rounded-sm px-0.5">
          {text.slice(idx, idx + q.length)}
        </span>
        {text.slice(idx + q.length)}
      </>
    )
  }

  const channelResults = results.filter((r) => r.type === 'channel')
  const userResults = results.filter((r) => r.type === 'user')
  const messageResults = results.filter((r) => r.type === 'message')

  // Compute flat index for each result for keyboard nav
  let flatIndex = 0
  const channelStartIndex = 0
  const userStartIndex = channelResults.length
  const messageStartIndex = channelResults.length + userResults.length

  // Quick actions for empty state
  const recentChannels = channels.slice(0, 3)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden rounded-xl shadow-2xl border-border/50">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
          <Search className="h-5 w-5 text-muted-foreground/60 shrink-0" />
          <input
            ref={inputRef}
            placeholder="Search messages, channels, people..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/50"
            autoFocus
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-primary/60" />}
        </div>

        {/* Results area */}
        <div ref={resultsRef} className="max-h-[420px] overflow-y-auto">
          {!query.trim() ? (
            /* ===== EMPTY STATE ===== */
            <div className="px-4 py-5">
              {/* Recent channels */}
              {recentChannels.length > 0 && (
