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
