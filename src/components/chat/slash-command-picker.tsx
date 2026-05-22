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
    ...matchingBuiltin.map(cmd => ({ source: 'builtin' as const, ...cmd })),
    ...matchingCustom.map(cmd => ({ source: 'custom' as const, ...cmd })),
  ]

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + allMatches.length) % allMatches.length)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % allMatches.length)
      } else if (e.key === 'Enter' && allMatches.length > 0) {
        e.preventDefault()
        const match = allMatches[selectedIndex]
        if (match) onSelect(match as BuiltinCommand | SlashCommand)
      } else if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [allMatches, selectedIndex, onSelect, onClose])

  if (allMatches.length === 0) return null

  return (
    <div
      ref={containerRef}
      className="fixed z-50 min-w-[280px] max-h-[200px] overflow-y-auto rounded-xl border shadow-lg"
      style={{
        left: position.left,
        bottom: position.bottom,
        background: '#fff',
        borderColor: '#E5E1EE',
        boxShadow: '0 8px 24px rgba(124, 92, 252, 0.1), 0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      <div className="p-1">
        {allMatches.map((match, i) => (
          <button
            key={match.source === 'builtin' ? match.command : match.id}
            onClick={() => onSelect(match as BuiltinCommand | SlashCommand)}
