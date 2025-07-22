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
