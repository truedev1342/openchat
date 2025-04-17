// All 23 SQL table definitions + RLS policies + triggers
// Ported from the Swift DatabaseProvisioner

export const migrations: string[] = [
  // 001 - Profiles
  `CREATE TABLE IF NOT EXISTS profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text,
    display_name text NOT NULL DEFAULT 'User',
    avatar_url text,
    status_emoji text,
    status_text text,
    is_online boolean DEFAULT false,
    last_seen_at timestamptz,
    created_at timestamptz DEFAULT now()
  );`,

  // 002 - Workspaces
  `CREATE TABLE IF NOT EXISTS workspaces (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    icon_url text,
    created_at timestamptz DEFAULT now()
  );`,

  // 003 - Workspace Members
  `CREATE TABLE IF NOT EXISTS workspace_members (
    workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
    profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'member',
    joined_at timestamptz DEFAULT now(),
    PRIMARY KEY (workspace_id, profile_id)
  );`,

  // 004 - Channels
  `CREATE TABLE IF NOT EXISTS channels (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    topic text,
    is_private boolean DEFAULT false,
    is_archived boolean DEFAULT false,
    created_by uuid REFERENCES profiles(id),
    created_at timestamptz DEFAULT now()
  );`,

  // 005 - Channel Members
  `CREATE TABLE IF NOT EXISTS channel_members (
    channel_id uuid REFERENCES channels(id) ON DELETE CASCADE,
    profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    role text DEFAULT 'member',
    notification_pref text DEFAULT 'all',
    joined_at timestamptz DEFAULT now(),
    PRIMARY KEY (channel_id, profile_id)
  );`,

  // 006 - Messages
  `CREATE TABLE IF NOT EXISTS messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    sender_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    content text NOT NULL DEFAULT '',
    parent_id uuid REFERENCES messages(id) ON DELETE SET NULL,
    thread_reply_count int DEFAULT 0,
    is_edited boolean DEFAULT false,
    is_deleted boolean DEFAULT false,
    metadata jsonb,
