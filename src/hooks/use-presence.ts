'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store/app-store'

const HEARTBEAT_INTERVAL = 60_000 // Update last_seen every 60s

/**
 * Tracks user presence: sets is_online=true on mount,
 * updates last_seen_at periodically, and sets is_online=false on unmount/tab close.
 */
export function usePresence() {
  const { user } = useAppStore()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!user) return

    const client = getSupabaseClient()
    if (!client) return

    // Set online + update last_seen
    async function setOnline() {
      await client!
        .from('profiles')
