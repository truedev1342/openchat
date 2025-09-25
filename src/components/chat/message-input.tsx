'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent, Extension } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Mention from '@tiptap/extension-mention'
import { SendHorizonal, Paperclip, Bold, Italic, Code, CodeSquare, ChevronUp, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store/app-store'
import type { Profile, SlashCommand } from '@/types/database'
import { SlashCommandPicker } from './slash-command-picker'
import { BUILTIN_COMMANDS, type BuiltinCommand } from '@/lib/slash-commands'
import { ScheduleMessageDialog } from './schedule-message-dialog'

interface MessageInputProps {
  channelId?: string
  channelName: string
  onSend: (content: string, attachments?: string[]) => Promise<void>
  placeholder?: string
}

// Convert TipTap HTML to our storage format (simplified markdown-like)
function htmlToContent(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html

  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || ''

    const el = node as HTMLElement
    const tag = el.tagName?.toLowerCase()
    const children = Array.from(el.childNodes).map(walk).join('')

    switch (tag) {
      case 'strong':
      case 'b':
        return `**${children}**`
      case 'em':
      case 'i':
        return `_${children}_`
      case 'code':
        if (el.parentElement?.tagName?.toLowerCase() === 'pre') return children
        return `\`${children}\``
      case 'pre':
        return `\`\`\`\n${children}\n\`\`\``
      case 'p':
        return children + '\n'
      case 'br':
        return '\n'
      case 'span':
        // Handle mentions
        if (el.dataset.type === 'mention') {
          return `@${el.dataset.id || children}`
        }
        return children
      default:
        return children
    }
  }

  return walk(div).replace(/\n+$/, '').trim()
}

export function MessageInput({ channelId, channelName, onSend, placeholder }: MessageInputProps) {
  const { workspace } = useAppStore()
  const [sending, setSending] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [attachments, setAttachments] = useState<{ name: string; url: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [members, setMembers] = useState<Profile[]>([])
  const membersRef = useRef<Profile[]>([])
  const [showSlashPicker, setShowSlashPicker] = useState(false)
  const [slashQuery, setSlashQuery] = useState('')
  const [slashPosition, setSlashPosition] = useState({ left: 0, bottom: 0 })
  const showSlashPickerRef = useRef(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [showSendMenu, setShowSendMenu] = useState(false)

