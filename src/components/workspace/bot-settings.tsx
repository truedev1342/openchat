'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store/app-store'
import { Plus, Copy, Trash2, Bot as BotIcon, Check, Key } from 'lucide-react'
import type { Bot } from '@/types/database'

export function BotSettings() {
  const { user, workspace } = useAppStore()
  const [bots, setBots] = useState<Bot[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showToken, setShowToken] = useState<string | null>(null)

  useEffect(() => {
    loadBots()
  }, [workspace])

  async function loadBots() {
    const client = getSupabaseClient()
