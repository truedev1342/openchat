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
  hiddenDmIds: string[]

  // Unread message counts per channel
  unreadCounts: Record<string, number>

  // Muted channel IDs
  mutedChannelIds: string[]

  // Reactions cache: messageId -> Reaction[]
  reactions: Record<string, Reaction[]>

  // Calls
  activeCall: ActiveCall | null
  isInCall: boolean
  callToken: string | null
  callUrl: string | null
  channelActiveCalls: Record<string, ActiveCall> // channelId -> ActiveCall

  // Saved items (bookmarks)
  savedItemIds: Set<string> // set of message IDs that are saved

  // Mobile / sidebar
  sidebarOpen: boolean

  // Actions
  setUser: (user: Profile | null) => void
  setWorkspace: (workspace: Workspace | null) => void
  setWorkspaceRole: (role: 'owner' | 'admin' | 'member' | null) => void
  setPreviewChannel: (channel: Channel | null) => void
  setChannels: (channels: Channel[]) => void
  setDmChannels: (channels: (Channel & { otherUser?: Profile; memberProfiles?: Profile[] })[]) => void
  addChannel: (channel: Channel) => void
  removeChannel: (channelId: string) => void
  updateChannel: (channelId: string, updates: Partial<Channel>) => void
  addDmChannel: (channel: Channel & { otherUser?: Profile; memberProfiles?: Profile[] }) => void
  setCurrentChannelId: (id: string | null) => void
  openThread: (message: Message) => void
  closeThread: () => void
  openProfile: (userId: string) => void
  closeProfile: () => void
  toggleActivity: () => void
  closeActivity: () => void
  addActivity: (item: ActivityItem) => void
  markActivityRead: (id: string) => void
  markAllActivitiesRead: () => void
  hideDm: (channelId: string) => void
  unhideDm: (channelId: string) => void
  incrementUnread: (channelId: string) => void
  clearUnread: (channelId: string) => void
  muteChannel: (channelId: string) => void
  unmuteChannel: (channelId: string) => void
  setReactions: (messageId: string, reactions: Reaction[]) => void
  addReaction: (messageId: string, reaction: Reaction) => void
  removeReaction: (messageId: string, reactionId: string) => void
  joinCall: (call: ActiveCall, token: string, url: string) => void
  leaveCall: () => void
  setChannelActiveCall: (channelId: string, call: ActiveCall | null) => void
  setSavedItemIds: (ids: Set<string>) => void
  toggleSavedItem: (messageId: string) => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  signOut: () => void
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  workspace: null,
  workspaceRole: null,
  channels: [],
  dmChannels: [],
  currentChannelId: null,
  previewChannel: null,
  threadParentMessage: null,
  profileUserId: null,
  activityOpen: false,
  activities: [],
