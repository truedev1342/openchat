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

  // Keep ref in sync with state so TipTap suggestion callback always sees latest
  useEffect(() => {
    membersRef.current = members
  }, [members])

  // Keep slash picker ref in sync
  useEffect(() => {
    showSlashPickerRef.current = showSlashPicker
  }, [showSlashPicker])

  // Load channel members (or workspace members as fallback) for @mentions
  useEffect(() => {
    const client = getSupabaseClient()
    if (!client || !workspace) return

    async function loadMembers() {
      if (channelId) {
        // Load members of the current channel
        const { data } = await client!
          .from('channel_members')
          .select('profile:profiles(*)')
          .eq('channel_id', channelId)

        if (data && data.length > 0) {
          const profiles = data
            .map((d: Record<string, unknown>) => d.profile as Profile)
            .filter(Boolean)
          setMembers(profiles)
          return
        }
      }

      // Fallback: load all workspace members
      const { data } = await client!
        .from('workspace_members')
        .select('profile:profiles(*)')
        .eq('workspace_id', workspace!.id)

      if (data) {
        const profiles = data
          .map((d: Record<string, unknown>) => d.profile as Profile)
          .filter(Boolean)
        setMembers(profiles)
      }
    }

    loadMembers()
  }, [workspace, channelId])

  // Custom Enter key extension
  const EnterSubmit = Extension.create({
    name: 'enterSubmit',
    addKeyboardShortcuts() {
      return {
        Enter: ({ editor }) => {
          // Shift+Enter for newline
          return false // let default handle, we check in onKeyDown
        },
      }
    },
  })

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        horizontalRule: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      Placeholder.configure({
        placeholder: placeholder || `Message #${channelName}`,
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention',
        },
        suggestion: {
          items: ({ query }: { query: string }) => {
            return membersRef.current
              .filter((m) =>
                m.display_name.toLowerCase().includes(query.toLowerCase())
              )
              .slice(0, 8)
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          render: () => {
            let popup: HTMLDivElement | null = null
            let selectedIndex = 0
            let items: Profile[] = []
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let command: any = null

            // SECURITY: Escape HTML entities to prevent XSS via display names
            function escapeHtml(str: string): string {
              return str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;')
            }

            function updatePopup() {
              if (!popup) return
              popup.innerHTML = items
                .map(
                  (item, i) => {
                    const safeName = escapeHtml(item.display_name || '')
                    const initial = escapeHtml(item.display_name?.[0]?.toUpperCase() || '?')
                    return `<button class="mention-item ${i === selectedIndex ? 'is-selected' : ''}" data-index="${i}">
                      <span class="mention-avatar">${initial}</span>
                      <span>${safeName}</span>
                    </button>`
                  }
                )
                .join('')

              popup.querySelectorAll('.mention-item').forEach((btn) => {
                btn.addEventListener('mousedown', (e) => {
                  e.preventDefault()
                  const idx = parseInt((btn as HTMLElement).dataset.index || '0')
                  const item = items[idx]
                  if (item && command) {
                    command({ id: item.id, label: item.display_name })
                  }
                })
              })
            }

            return {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onStart: (props: any) => {
                items = props.items
                command = props.command
                selectedIndex = 0

                popup = document.createElement('div')
                popup.className = 'mention-popup'
                document.body.appendChild(popup)

                updatePopup()

                if (props.clientRect) {
                  const rect = props.clientRect?.()
                  if (rect && popup) {
                    popup.style.left = `${rect.left}px`
                    popup.style.top = `${rect.top - popup.offsetHeight - 8}px`
                  }
                }
              },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onUpdate: (props: any) => {
                items = props.items
                selectedIndex = 0
                updatePopup()

                if (props.clientRect && popup) {
                  const rect = props.clientRect?.()
                  if (rect) {
                    popup.style.left = `${rect.left}px`
