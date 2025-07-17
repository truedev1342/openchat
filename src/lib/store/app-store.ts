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
  unreadActivityCount: 0,
  hiddenDmIds: [],
  unreadCounts: {},
  mutedChannelIds: [],
  reactions: {},
  activeCall: null,
  isInCall: false,
  callToken: null,
  callUrl: null,
  channelActiveCalls: {},
  savedItemIds: new Set(),
  sidebarOpen: false,

  setUser: (user) => set({ user }),
  setWorkspace: (workspace) => set({ workspace }),
  setWorkspaceRole: (workspaceRole) => set({ workspaceRole }),
  setPreviewChannel: (previewChannel) => set({ previewChannel, threadParentMessage: null, profileUserId: null }),
  setChannels: (channels) => set({ channels }),
  setDmChannels: (dmChannels) => set({ dmChannels }),
  addChannel: (channel) =>
    set((state) => ({
      channels: [...state.channels, channel].sort((a, b) => a.name.localeCompare(b.name)),
    })),
  removeChannel: (channelId) =>
    set((state) => ({
      channels: state.channels.filter((c) => c.id !== channelId),
      currentChannelId: state.currentChannelId === channelId ? null : state.currentChannelId,
    })),
  updateChannel: (channelId, updates) =>
    set((state) => ({
      channels: state.channels.map((c) =>
        c.id === channelId ? { ...c, ...updates } : c
      ).sort((a, b) => a.name.localeCompare(b.name)),
    })),
  addDmChannel: (channel) =>
    set((state) => ({
      dmChannels: [...state.dmChannels.filter((c) => c.id !== channel.id), channel],
      // Auto-unhide if a new message caused this DM to appear
      hiddenDmIds: state.hiddenDmIds.filter((id) => id !== channel.id),
    })),
  setCurrentChannelId: (currentChannelId) => set((state) => {
    // Mark activities for this channel as read
    let readCount = 0
    const updatedActivities = state.activities.map((a) => {
      if (currentChannelId && a.channelId === currentChannelId && !a.read) {
        readCount++
        return { ...a, read: true }
      }
      return a
    })

    return {
      currentChannelId,
      previewChannel: null,
      threadParentMessage: null,
      profileUserId: null,
      unreadCounts: currentChannelId
        ? { ...state.unreadCounts, [currentChannelId]: 0 }
        : state.unreadCounts,
      activities: updatedActivities,
      unreadActivityCount: Math.max(0, state.unreadActivityCount - readCount),
    }
  }),
  openThread: (message) => set({ threadParentMessage: message, profileUserId: null }),
  closeThread: () => set({ threadParentMessage: null }),
  openProfile: (userId) => set({ profileUserId: userId, threadParentMessage: null }),
  closeProfile: () => set({ profileUserId: null }),
  toggleActivity: () => set((state) => ({
    activityOpen: !state.activityOpen,
    threadParentMessage: null,
    profileUserId: null,
  })),
  closeActivity: () => set({ activityOpen: false }),
  addActivity: (item) =>
    set((state) => ({
