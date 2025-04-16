// Types for all 23 OpenChat database tables

export interface Profile {
  id: string
  email: string | null
  display_name: string
  avatar_url: string | null
  status_emoji: string | null
  status_text: string | null
  is_online: boolean
  last_seen_at: string | null
  created_at: string
}

export interface Workspace {
  id: string
  name: string
  slug: string
  icon_url: string | null
  created_at: string
}

export interface WorkspaceMember {
  workspace_id: string
  profile_id: string
  role: 'owner' | 'admin' | 'member'
  joined_at: string
  workspace?: Workspace
  profile?: Profile
}

export interface Channel {
  id: string
  workspace_id: string
  name: string
  description: string | null
  topic: string | null
  is_private: boolean
  is_archived: boolean
  created_by: string | null
  created_at: string
}

export interface ChannelMember {
  channel_id: string
  profile_id: string
  role: string
  notification_pref: string
  joined_at: string
}

export interface Message {
  id: string
  channel_id: string
  sender_id: string | null
  content: string
  parent_id: string | null
  thread_reply_count: number
  is_edited: boolean
  is_deleted: boolean
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
  // Joined
  sender?: Profile
}

export interface Reaction {
  id: string
  message_id: string
  profile_id: string
  emoji: string
  created_at: string
}

export interface FileAttachment {
  id: string
  message_id: string
  file_name: string
  file_url: string
  file_size: number | null
  mime_type: string | null
  created_at: string
}
