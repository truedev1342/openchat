'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store/app-store'
import { Sidebar } from '@/components/sidebar/sidebar'
import { ActivityPanel } from '@/components/activity/activity-panel'
import { CallPanel } from '@/components/calls/call-panel'
import { IncomingCallBanner } from '@/components/calls/incoming-call-banner'
import { WorkspaceSetup } from '@/components/workspace/workspace-setup'
import type { Profile, Workspace, WorkspaceMember, Channel } from '@/types/database'
import { Loader2 } from 'lucide-react'
import { useNotifications } from '@/hooks/use-notifications'
import { usePresence } from '@/hooks/use-presence'
import { useScheduledMessages } from '@/hooks/use-scheduled-messages'
import { useMobile } from '@/hooks/use-mobile'

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, workspace, setUser, setWorkspace, setWorkspaceRole, setChannels, setCurrentChannelId, sidebarOpen, setSidebarOpen } = useAppStore()
  const { isMobile, isTablet, isDesktop } = useMobile()
  const [loading, setLoading] = useState(true)
  const [showWorkspaceSetup, setShowWorkspaceSetup] = useState(false)

  // Enable browser notifications for mentions and DMs
  useNotifications()

  // Track user presence (online status + last_seen_at)
  usePresence()

  // Poll and send scheduled messages when due
  useScheduledMessages()

  useEffect(() => {
    loadUserData()
    // Ensure storage buckets exist (fire-and-forget)
    fetch('/api/storage', { method: 'POST' }).catch(() => {})
  }, [])

  async function loadUserData() {
    const client = getSupabaseClient()
    if (!client) {
      router.push('/setup')
      return
    }

    try {
      const { data: { session } } = await client.auth.getSession()
      if (!session) {
