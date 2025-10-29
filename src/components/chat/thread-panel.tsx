'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { X, Loader2 } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store/app-store'
import { MessageBubble } from './message-bubble'
import { MessageInput } from './message-input'
import type { Message } from '@/types/database'

export function ThreadPanel() {
  const { threadParentMessage, closeThread, user } = useAppStore()
  const [replies, setReplies] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const repliesRef = useRef<Message[]>([])

  useEffect(() => {
    repliesRef.current = replies
  }, [replies])

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [])

  useEffect(() => {
    if (!threadParentMessage) return

    const client = getSupabaseClient()
    if (!client) return

    async function loadReplies() {
      setLoading(true)
      const { data } = await client!
        .from('messages')
        .select('*, sender:profiles(*)')
        .eq('parent_id', threadParentMessage!.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })

      if (data) {
        setReplies(data as Message[])
        scrollToBottom()
      }
      setLoading(false)
    }

    loadReplies()

    const sub = client
      .channel(`thread:${threadParentMessage.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `parent_id=eq.${threadParentMessage.id}`,
        },
        async (payload) => {
          const { data } = await client
            .from('messages')
            .select('*, sender:profiles(*)')
            .eq('id', payload.new.id)
            .single()

          if (data && !repliesRef.current.find((m) => m.id === data.id)) {
            setReplies((prev) => [...prev, data as Message])
            scrollToBottom()
          }
        }
      )
      .subscribe()

