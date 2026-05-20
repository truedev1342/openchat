'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store/app-store'

export function useScheduledMessages() {
  const { user, workspace } = useAppStore()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!user || !workspace) return

    async function checkScheduledMessages() {
      const client = getSupabaseClient()
      if (!client) return

      const now = new Date().toISOString()

      const { data: dueMessages } = await client
