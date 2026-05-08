'use client'

import { useState, useEffect, useRef } from 'react'
import { BUILTIN_COMMANDS, type BuiltinCommand } from '@/lib/slash-commands'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store/app-store'
import type { SlashCommand } from '@/types/database'
import { Terminal, Zap } from 'lucide-react'

interface SlashCommandPickerProps {
  query: string
  onSelect: (command: BuiltinCommand | SlashCommand) => void
  onClose: () => void
  position: { left: number; bottom: number }
}

export function SlashCommandPicker({ query, onSelect, onClose, position }: SlashCommandPickerProps) {
  const { workspace } = useAppStore()
  const [customCommands, setCustomCommands] = useState<SlashCommand[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!workspace) return
    const client = getSupabaseClient()
    if (!client) return

    client
      .from('slash_commands')
      .select('*')
      .eq('workspace_id', workspace.id)
      .eq('is_active', true)
      .then(({ data }) => {
        if (data) setCustomCommands(data as SlashCommand[])
      })
  }, [workspace])

  const cleanQuery = query.startsWith('/') ? query.slice(1) : query

  const matchingBuiltin = BUILTIN_COMMANDS.filter(cmd =>
    cmd.command.slice(1).toLowerCase().startsWith(cleanQuery.toLowerCase())
  )

  const matchingCustom = customCommands.filter(cmd =>
    cmd.command.toLowerCase().startsWith(cleanQuery.toLowerCase())
  )

  const allMatches = [
