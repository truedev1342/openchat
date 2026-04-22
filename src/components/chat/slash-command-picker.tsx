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
