'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store/app-store'
import { MessageBubble } from './message-bubble'
import { MessageInput } from './message-input'
import { ThreadPanel } from './thread-panel'
import { UserProfilePanel } from './user-profile-panel'
import { ChannelSettingsDialog } from './channel-settings-dialog'
import { CallSetupDialog } from '@/components/calls/call-setup-dialog'
import type { Channel, Message, ActiveCall } from '@/types/database'
import { Hash, Lock, Users, Loader2, LogIn, Phone, PhoneOff, Video, Menu } from 'lucide-react'
import { useMobile } from '@/hooks/use-mobile'

const PAGE_SIZE = 50

interface ChannelViewProps {
  channel: Channel
  isPreview?: boolean
}

export function ChannelView({ channel, isPreview = false }: ChannelViewProps) {
  const { user, workspace, threadParentMessage, profileUserId, dmChannels, openProfile, addChannel, setCurrentChannelId, setPreviewChannel, channelActiveCalls, setChannelActiveCall, joinCall, isInCall, toggleSidebar } = useAppStore()
  const { isMobile, isDesktop } = useMobile()
  const isDm = channel.name.startsWith('dm-')
  const isGroupDm = channel.name.startsWith('gdm-')
  const isDirectMessage = isDm || isGroupDm
  const dmInfo = isDirectMessage ? dmChannels.find((d) => d.id === channel.id) : null
  const displayChannelName = isGroupDm
    ? (dmInfo?.memberProfiles || []).map(m => m.display_name).join(', ') || 'Group DM'
    : isDm && dmInfo?.otherUser
      ? dmInfo.otherUser.display_name
      : channel.name
  const [channelSettingsOpen, setChannelSettingsOpen] = useState(false)
  const [joiningChannel, setJoiningChannel] = useState(false)
  const [startingCall, setStartingCall] = useState(false)
  const [callSetupOpen, setCallSetupOpen] = useState(false)
  const channelCall = channelActiveCalls[channel.id] || null
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const messagesRef = useRef<Message[]>([])
  const isInitialLoad = useRef(true)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [])

  const loadOlderMessages = useCallback(async () => {
    if (loadingMore || !hasMore || messages.length === 0) return

    const client = getSupabaseClient()
    if (!client) return

    setLoadingMore(true)
    const oldestMessage = messages[0]
    const scrollContainer = scrollContainerRef.current
    const prevScrollHeight = scrollContainer?.scrollHeight || 0

    const { data } = await client
      .from('messages')
      .select('*, sender:profiles(*)')
      .eq('channel_id', channel.id)
      .eq('is_deleted', false)
      .is('parent_id', null)
      .lt('created_at', oldestMessage.created_at)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)

    if (data) {
      const olderMessages = (data as Message[]).reverse()
      if (olderMessages.length < PAGE_SIZE) {
        setHasMore(false)
      }
      if (olderMessages.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id))
          const unique = olderMessages.filter((m) => !existingIds.has(m.id))
          return [...unique, ...prev]
        })
        requestAnimationFrame(() => {
          if (scrollContainer) {
            const newScrollHeight = scrollContainer.scrollHeight
            scrollContainer.scrollTop = newScrollHeight - prevScrollHeight
          }
        })
      }
    }

    setLoadingMore(false)
  }, [loadingMore, hasMore, messages, channel.id])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    function handleScroll() {
      if (container!.scrollTop < 100 && !loadingMore && hasMore && !loading) {
        loadOlderMessages()
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [loadOlderMessages, loadingMore, hasMore, loading])

  useEffect(() => {
    const client = getSupabaseClient()
    if (!client) return

    async function loadMessages() {
      setLoading(true)
      setHasMore(true)
      isInitialLoad.current = true

      const { data } = await client!
        .from('messages')
        .select('*, sender:profiles(*)')
        .eq('channel_id', channel.id)
        .eq('is_deleted', false)
        .is('parent_id', null)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (data) {
        const msgs = (data as Message[]).reverse()
        setMessages(msgs)
        if (data.length < PAGE_SIZE) {
          setHasMore(false)
        }
        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: 'instant' })
          isInitialLoad.current = false
        }, 100)
      }
      setLoading(false)
    }

    async function fetchMessage(id: string): Promise<Message | null> {
      const { data } = await client!
        .from('messages')
        .select('*, sender:profiles(*)')
        .eq('id', id)
        .single()
      return data as Message | null
    }

    loadMessages()

    const channelSub = client
      .channel(`messages:${channel.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channel.id}`,
        },
        async (payload) => {
          if (payload.new.parent_id) return

          const fullMessage = await fetchMessage(payload.new.id)
          if (fullMessage) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === fullMessage.id)) return prev
              return [...prev, fullMessage]
            })
            const container = scrollContainerRef.current
            if (container) {
              const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200
              if (isNearBottom || payload.new.sender_id === user?.id) {
                scrollToBottom()
              }
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channel.id}`,
        },
        async (payload) => {
          if (payload.new.is_deleted) {
            setMessages((prev) => prev.filter((m) => m.id !== payload.new.id))
          } else {
            const updated = await fetchMessage(payload.new.id)
            if (updated) {
              setMessages((prev) =>
                prev.map((m) => (m.id === updated.id ? updated : m))
              )
            }
          }
        }
      )
      .subscribe()

    return () => {
      channelSub.unsubscribe()
    }
  }, [channel.id, scrollToBottom, user?.id])

  async function handleSendMessage(content: string) {
    const client = getSupabaseClient()
    if (!client || !user) return

    await client.from('messages').insert({
      channel_id: channel.id,
      sender_id: user.id,
      content,
    })
  }

  async function handleJoinPreview() {
    const client = getSupabaseClient()
    if (!client || !user) return

    setJoiningChannel(true)
    try {
      await client.from('channel_members').insert({
        channel_id: channel.id,
        profile_id: user.id,
        role: 'member',
      })

      // Add to sidebar and switch to it
      addChannel(channel)
      setPreviewChannel(null)
      setCurrentChannelId(channel.id)
    } catch (err) {
      console.error('Failed to join channel:', err)
    }
    setJoiningChannel(false)
  }

  // Load active call for this channel
  useEffect(() => {
    const client = getSupabaseClient()
    if (!client || !workspace) return

    async function loadActiveCall() {
      const { data } = await client!
        .from('active_calls')
        .select('*')
        .eq('channel_id', channel.id)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)

      if (data && data.length > 0) {
        setChannelActiveCall(channel.id, data[0] as ActiveCall)
      } else {
        setChannelActiveCall(channel.id, null)
      }
    }

    loadActiveCall()

    // Subscribe to active_calls changes for this channel
    const callSub = client
      .channel(`calls:${channel.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_calls',
          filter: `channel_id=eq.${channel.id}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            setChannelActiveCall(channel.id, payload.new as ActiveCall)
          } else if (payload.eventType === 'UPDATE') {
            const call = payload.new as ActiveCall
            if (call.ended_at) {
              setChannelActiveCall(channel.id, null)
            } else {
