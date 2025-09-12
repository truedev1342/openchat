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
