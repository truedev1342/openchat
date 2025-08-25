'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/store/app-store'
import { getSupabaseClient } from '@/lib/supabase/client'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Hash,
  Lock,
  Plus,
  LogOut,
  ChevronDown,
  ChevronRight,
  Circle,
  UserPlus,
  Search,
  PenSquare,
  Bell,
  BellOff,
  X,
  Compass,
  Phone,
  Bookmark,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CreateChannelDialog } from './create-channel-dialog'
import { DmDialog } from './dm-dialog'
import { BrowseChannelsDialog } from './browse-channels-dialog'
import { InviteDialog } from '@/components/workspace/invite-dialog'
import { WorkspaceSettingsDialog } from '@/components/workspace/workspace-settings-dialog'
import { SearchDialog } from '@/components/search/search-dialog'
import { ProfileEditDialog } from '@/components/profile/profile-edit-dialog'
import { SavedItemsPanel } from '@/components/bookmarks/saved-items-panel'
import type { Profile, Channel, ActiveCall } from '@/types/database'

interface SidebarProps {
  onNavigate?: () => void
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const router = useRouter()
  const {
    user, workspace, channels, dmChannels, currentChannelId,
    setCurrentChannelId, setDmChannels, toggleActivity, unreadActivityCount,
    hiddenDmIds, hideDm, unreadCounts, mutedChannelIds, muteChannel, unmuteChannel,
    channelActiveCalls, setChannelActiveCall,
  } = useAppStore()
  const [channelsOpen, setChannelsOpen] = useState(true)
  const [dmsOpen, setDmsOpen] = useState(true)
  const [createChannelOpen, setCreateChannelOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [dmDialogOpen, setDmDialogOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [profileEditOpen, setProfileEditOpen] = useState(false)
  const [browseOpen, setBrowseOpen] = useState(false)
  const [workspaceSettingsOpen, setWorkspaceSettingsOpen] = useState(false)
  const [savedItemsOpen, setSavedItemsOpen] = useState(false)

  // Load DM channels + subscribe to new DMs + track unread in real-time
  useEffect(() => {
    if (!workspace || !user) return
    const client = getSupabaseClient()
    if (!client) return

    async function loadDms() {
      const { data: myChannels } = await client!
        .from('channel_members')
        .select('channel_id')
        .eq('profile_id', user!.id)

      if (!myChannels) return

      const channelIds = myChannels.map((c) => c.channel_id)
      if (channelIds.length === 0) return

      const { data: dms } = await client!
        .from('channels')
        .select('*')
        .eq('workspace_id', workspace!.id)
        .or('name.like.dm-%,name.like.gdm-%')
        .in('id', channelIds)

      if (!dms || dms.length === 0) return

      const dmWithUsers: (Channel & { otherUser?: Profile; memberProfiles?: Profile[] })[] = []

      for (const dm of dms) {
        const { data: members } = await client!
          .from('channel_members')
          .select('profile_id, profile:profiles(*)')
          .eq('channel_id', dm.id)

        if (dm.name.startsWith('gdm-')) {
          // Group DM: collect all other members
          const otherMembers = members
            ?.filter(m => m.profile_id !== user!.id)
            .map(m => m.profile as unknown as Profile)
            .filter(Boolean) || []
          dmWithUsers.push({
            ...dm,
            memberProfiles: otherMembers,
          })
        } else {
          // Regular DM: single other user
          const other = members?.find((m) => m.profile_id !== user!.id)
          dmWithUsers.push({
            ...dm,
            otherUser: other?.profile as unknown as Profile | undefined,
          })
        }
      }

      setDmChannels(dmWithUsers)
    }

    loadDms()

    // Subscribe to new messages — track unread + auto-add DM channels
    const newMsgSub = client
      .channel('sidebar-dm-watcher')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const msg = payload.new as { channel_id: string; sender_id: string }
          if (msg.sender_id === user!.id) return

          const state = useAppStore.getState()

          // Track unread count for any channel in sidebar (if not currently viewing)
          if (msg.channel_id !== state.currentChannelId) {
            const isKnownChannel =
              state.channels.some((c) => c.id === msg.channel_id) ||
              state.dmChannels.some((d) => d.id === msg.channel_id)
            if (isKnownChannel) {
              state.incrementUnread(msg.channel_id)
            }
          }

          // Check if this channel is already in our DM list
          if (state.dmChannels.some((d) => d.id === msg.channel_id)) return

          // Check if this is a DM or group DM channel we're a member of
          const { data: ch } = await client!
            .from('channels')
            .select('*')
            .eq('id', msg.channel_id)
            .or('name.like.dm-%,name.like.gdm-%')
            .single()

          if (!ch) return

          // Verify we're a member
          const { data: membership } = await client!
            .from('channel_members')
            .select('profile_id')
            .eq('channel_id', ch.id)
            .eq('profile_id', user!.id)
            .single()

          if (!membership) return

          // Load the members
          const { data: members } = await client!
            .from('channel_members')
            .select('profile_id, profile:profiles(*)')
            .eq('channel_id', ch.id)

          if (ch.name.startsWith('gdm-')) {
            const otherMembers = members
              ?.filter((m) => m.profile_id !== user!.id)
              .map(m => m.profile as unknown as Profile)
              .filter(Boolean) || []
            useAppStore.getState().addDmChannel({
              ...ch,
              memberProfiles: otherMembers,
            })
          } else {
            const other = members?.find((m) => m.profile_id !== user!.id)
            useAppStore.getState().addDmChannel({
              ...ch,
              otherUser: other?.profile as unknown as Profile | undefined,
            })
          }
        }
      )
      .subscribe()

    // Subscribe to channel_members changes — detect when user is removed from a channel
    const membershipSub = client
      .channel('sidebar-membership-watcher')
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'channel_members' },
        (payload) => {
          const old = payload.old as { channel_id?: string; profile_id?: string }
          if (old.profile_id === user!.id && old.channel_id) {
            const state = useAppStore.getState()
            const isDm = state.dmChannels.some((d) => d.id === old.channel_id)
            if (isDm) {
              state.setDmChannels(state.dmChannels.filter((d) => d.id !== old.channel_id))
            } else {
              state.removeChannel(old.channel_id!)
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'channel_members' },
        async (payload) => {
          const row = payload.new as { channel_id: string; profile_id: string; role: string }
          if (row.profile_id !== user!.id) return

          const state = useAppStore.getState()
          if (state.channels.some((c) => c.id === row.channel_id)) return
          if (state.dmChannels.some((d) => d.id === row.channel_id)) return

          const { data: ch } = await client!
            .from('channels')
            .select('*')
            .eq('id', row.channel_id)
            .single()

          if (!ch) return

          if (ch.name.startsWith('dm-') || ch.name.startsWith('gdm-')) {
            const { data: members } = await client!
              .from('channel_members')
              .select('profile_id, profile:profiles(*)')
              .eq('channel_id', ch.id)

            if (ch.name.startsWith('gdm-')) {
              const otherMembers = members
                ?.filter((m) => m.profile_id !== user!.id)
                .map(m => m.profile as unknown as Profile)
                .filter(Boolean) || []
              useAppStore.getState().addDmChannel({
                ...ch,
                memberProfiles: otherMembers,
              })
            } else {
              const other = members?.find((m) => m.profile_id !== user!.id)
              useAppStore.getState().addDmChannel({
                ...ch,
                otherUser: other?.profile as unknown as Profile | undefined,
              })
            }
          } else {
            useAppStore.getState().addChannel(ch as Channel)
          }
        }
      )
      .subscribe()

    return () => {
      newMsgSub.unsubscribe()
      membershipSub.unsubscribe()
    }
  }, [workspace, user, setDmChannels])

  // ⌘K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Load & subscribe to active calls across workspace
  useEffect(() => {
    if (!workspace) return
    const client = getSupabaseClient()
    if (!client) return

    async function loadActiveCalls() {
      const { data } = await client!
        .from('active_calls')
        .select('*')
        .eq('workspace_id', workspace!.id)
        .is('ended_at', null)

      if (data) {
        data.forEach((call: ActiveCall) => {
          setChannelActiveCall(call.channel_id, call)
        })
      }
    }

    loadActiveCalls()

    const callsSub = client
      .channel('sidebar-calls-watcher')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_calls',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const call = payload.new as ActiveCall
            if (call.workspace_id === workspace!.id) {
              setChannelActiveCall(call.channel_id, call)
            }
          } else if (payload.eventType === 'UPDATE') {
            const call = payload.new as ActiveCall
            if (call.workspace_id === workspace!.id) {
              if (call.ended_at) {
                setChannelActiveCall(call.channel_id, null)
              } else {
                setChannelActiveCall(call.channel_id, call)
              }
            }
          }
        }
      )
      .subscribe()

    return () => {
      callsSub.unsubscribe()
    }
  }, [workspace])

  async function handleSignOut() {
    const client = getSupabaseClient()
    if (client) {
      await client.auth.signOut()
    }
    useAppStore.getState().signOut()
    router.push('/auth')
  }

  const regularChannels = channels.filter((c) => !c.name.startsWith('dm-') && !c.name.startsWith('gdm-'))

  // Sort channels: unmuted first (alphabetical), then muted (alphabetical)
  const sortedChannels = [...regularChannels].sort((a, b) => {
    const aMuted = mutedChannelIds.includes(a.id)
    const bMuted = mutedChannelIds.includes(b.id)
    if (aMuted !== bMuted) return aMuted ? 1 : -1
    return a.name.localeCompare(b.name)
  })

  return (
    <>
      <div className="w-[260px] flex flex-col h-full" style={{ background: '#F0EBFF', borderRight: '1px solid #DDD6F3' }}>
        {/* Workspace header */}
        <div className="px-4 py-3.5 flex items-center justify-between" style={{ borderBottom: '1px solid #DDD6F3' }}>
          <button
            onClick={() => setWorkspaceSettingsOpen(true)}
            className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
          >
            <div className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: '#7C5CFC' }}>
              {(workspace?.name || 'O')[0]?.toUpperCase()}
            </div>
            <span className="font-[800] text-[16px] truncate" style={{ color: '#2D2B3D' }}>{workspace?.name || 'OpenChat'}</span>
          </button>
          <button
            onClick={() => setDmDialogOpen(true)}
            className="h-8 w-8 rounded-lg flex items-center justify-center transition-all hover:bg-[#E0D6FF]"
          >
            <PenSquare className="h-4 w-4" style={{ color: '#8E8EA0' }} />
          </button>
