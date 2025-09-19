'use client'

import { useState, useRef, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { MessageSquare, Smile, MoreHorizontal, Pencil, Trash2, Bookmark } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getSupabaseClient } from '@/lib/supabase/client'
import DOMPurify from 'dompurify'
import { useAppStore } from '@/lib/store/app-store'
import { EmojiPicker, QUICK_REACTIONS } from './emoji-picker'
import type { Message, Reaction } from '@/types/database'

// Global cache for resolved mention display names (userId -> displayName)
const mentionNameCache: Record<string, string> = {}

// Render message content with markdown-like formatting
function renderMessageContent(text: string, mentionNames?: Record<string, string>): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  html = html.replace(/```\n?([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
  html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/(?<!\w)_(.+?)_(?!\w)/g, '<em>$1</em>')
  html = html.replace(/@([a-f0-9-]{36})/g, (_match, uuid) => {
    const name = mentionNames?.[uuid] || mentionNameCache[uuid] || uuid.slice(0, 8)
    return `<span class="mention-highlight">@${name}</span>`
  })
  html = html.replace(/@(\w+)/g, '<span class="mention-highlight">@$1</span>')
  html = html.replace(
    /📎\s*\[([^\]]+)\]\(([^)]+)\)/g,
    '📎 <a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  )
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  )
  html = html.replace(
    /(?<!["\w])(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  )

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['strong', 'em', 'code', 'pre', 'a', 'span'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  })
}

