import { create } from 'zustand'
import type { Profile, Workspace, Channel, Message, Reaction, WorkspaceMember, ActiveCall } from '@/types/database'

export interface ActivityItem {
  id: string
  type: 'mention' | 'dm' | 'reaction' | 'thread_reply'
  message: Message
  channelId: string
  channelName: string
  timestamp: string
  read: boolean
}

interface AppState {
  // Auth
  user: Profile | null
  workspace: Workspace | null
  workspaceRole: 'owner' | 'admin' | 'member' | null
  channels: Channel[]
  dmChannels: (Channel & { otherUser?: Profile; memberProfiles?: Profile[] })[]
  currentChannelId: string | null

  // Preview channel (public channel user hasn't joined yet)
  previewChannel: Channel | null

  // Thread
  threadParentMessage: Message | null

  // User profile panel
  profileUserId: string | null

  // Activity panel
  activityOpen: boolean
  activities: ActivityItem[]
  unreadActivityCount: number

  // Hidden DM channel IDs (conversations user closed)
