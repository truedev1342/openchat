'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store/app-store'
import type { Message } from '@/types/database'

export function useNotifications() {
  const { user, workspace, currentChannelId } = useAppStore()
  const permissionRef = useRef<NotificationPermission>('default')

  // Request notification permission
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return

    if (Notification.permission === 'default') {
      Notification.requestPermission().then((p) => {
        permissionRef.current = p
      })
    } else {
      permissionRef.current = Notification.permission
    }
  }, [])

  // Subscribe to mentions and DMs — push to activity panel + browser notifications
  useEffect(() => {
    if (!user || !workspace) return
    const client = getSupabaseClient()
    if (!client) return

    const sub = client
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const msg = payload.new as {
            id: string
            channel_id: string
            sender_id: string
            content: string
            parent_id: string | null
            created_at: string
          }

          // Don't notify for own messages — but mark activities for that channel as read
          // (the user is clearly active in this channel)
          if (msg.sender_id === user.id) {
            const s = useAppStore.getState()
            let readCount = 0
            const updated = s.activities.map((a) => {
              if (a.channelId === msg.channel_id && !a.read) {
                readCount++
                return { ...a, read: true }
              }
              return a
            })
            if (readCount > 0) {
              useAppStore.setState({
                activities: updated,
                unreadActivityCount: Math.max(0, s.unreadActivityCount - readCount),
              })
            }
            return
          }

          const state = useAppStore.getState()

          // Skip activity + browser notifications for muted channels
          if (state.mutedChannelIds.includes(msg.channel_id)) return

