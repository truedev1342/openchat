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
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );`,

  // 007 - Reactions
  `CREATE TABLE IF NOT EXISTS reactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    emoji text NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(message_id, profile_id, emoji)
  );`,

  // 008 - File Attachments
  `CREATE TABLE IF NOT EXISTS file_attachments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    file_name text NOT NULL,
    file_url text NOT NULL,
    file_size bigint,
    mime_type text,
    created_at timestamptz DEFAULT now()
  );`,

  // 009 - Pins
  `CREATE TABLE IF NOT EXISTS pins (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    pinned_by uuid NOT NULL REFERENCES profiles(id),
    created_at timestamptz DEFAULT now(),
    UNIQUE(channel_id, message_id)
  );`,

  // 010 - Read Receipts
  `CREATE TABLE IF NOT EXISTS read_receipts (
    profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    channel_id uuid REFERENCES channels(id) ON DELETE CASCADE,
    last_read_at timestamptz DEFAULT now(),
    PRIMARY KEY (profile_id, channel_id)
  );`,

  // 025 - Workspace Settings
  `CREATE TABLE IF NOT EXISTS workspace_settings (
    workspace_id uuid PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
    livekit_url text,
    livekit_api_key text,
    livekit_api_secret text,
    calls_enabled boolean DEFAULT false
  );`,

  // 026 - Active Calls
  `CREATE TABLE IF NOT EXISTS active_calls (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    type text NOT NULL DEFAULT 'huddle',
    livekit_room_name text NOT NULL,
    started_by uuid NOT NULL REFERENCES profiles(id),
    started_at timestamptz DEFAULT now(),
    ended_at timestamptz
  );`,

  // 027 - Call Participants
  `CREATE TABLE IF NOT EXISTS call_participants (
    call_id uuid REFERENCES active_calls(id) ON DELETE CASCADE,
    profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    joined_at timestamptz DEFAULT now(),
    left_at timestamptz,
    is_muted boolean DEFAULT false,
    is_camera_on boolean DEFAULT false,
    is_sharing_screen boolean DEFAULT false,
    PRIMARY KEY (call_id, profile_id)
  );`,

  // 028 - Incoming Webhooks
  `CREATE TABLE IF NOT EXISTS incoming_webhooks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    channel_id uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    name text NOT NULL,
    token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    avatar_url text,
    display_name text,
    is_active boolean DEFAULT true,
    created_by uuid NOT NULL REFERENCES profiles(id),
    created_at timestamptz DEFAULT now()
  );`,

  // 029 - Outgoing Webhooks
  `CREATE TABLE IF NOT EXISTS outgoing_webhooks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name text NOT NULL,
    url text NOT NULL,
    signing_secret text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    events text[] NOT NULL DEFAULT '{}',
    channel_filter uuid[],
    is_active boolean DEFAULT true,
    retry_count int DEFAULT 3,
    created_by uuid NOT NULL REFERENCES profiles(id),
    created_at timestamptz DEFAULT now()
  );`,

  // 030 - Webhook Delivery Logs
  `CREATE TABLE IF NOT EXISTS webhook_delivery_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id uuid NOT NULL REFERENCES outgoing_webhooks(id) ON DELETE CASCADE,
    event_type text NOT NULL,
    status_code int,
    response_body text,
    latency_ms int,
    attempt int DEFAULT 1,
    error text,
    created_at timestamptz DEFAULT now()
  );`,

  // 031 - Bots
  `CREATE TABLE IF NOT EXISTS bots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name text NOT NULL,
    display_name text NOT NULL,
    avatar_url text,
    description text,
    bot_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    scopes text[] DEFAULT '{}',
    is_active boolean DEFAULT true,
    created_by uuid NOT NULL REFERENCES profiles(id),
    created_at timestamptz DEFAULT now()
  );`,

  // 032 - Bot Channel Memberships
  `CREATE TABLE IF NOT EXISTS bot_channel_memberships (
    bot_id uuid REFERENCES bots(id) ON DELETE CASCADE,
    channel_id uuid REFERENCES channels(id) ON DELETE CASCADE,
    added_by uuid REFERENCES profiles(id),
    added_at timestamptz DEFAULT now(),
