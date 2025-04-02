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
