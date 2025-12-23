'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store/app-store'
import { Bookmark, X, Loader2, Trash2, Wrench } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Message, SavedItem } from '@/types/database'

interface SavedItemsPanelProps {
  open: boolean
  onClose: () => void
}

const SAVED_ITEMS_SQL = `
CREATE TABLE IF NOT EXISTS saved_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, message_id)
);
ALTER TABLE saved_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "si_select" ON saved_items;
DROP POLICY IF EXISTS "si_insert" ON saved_items;
DROP POLICY IF EXISTS "si_delete" ON saved_items;
CREATE POLICY "si_select" ON saved_items FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "si_insert" ON saved_items FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "si_delete" ON saved_items FOR DELETE USING (user_id = auth.uid());
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE saved_items; EXCEPTION WHEN OTHERS THEN NULL; END $$;
`

export function SavedItemsPanel({ open, onClose }: SavedItemsPanelProps) {
  const { user, workspace, setSavedItemIds, toggleSavedItem, setCurrentChannelId } = useAppStore()
  const [savedItems, setSavedItems] = useState<(SavedItem & { message: Message })[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Fix flow
  const [showFix, setShowFix] = useState(false)
  const [pat, setPat] = useState('')
  const [fixing, setFixing] = useState(false)
  const [fixError, setFixError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !user || !workspace) return
    loadSavedItems()
  }, [open, user, workspace])

  async function loadSavedItems() {
    const client = getSupabaseClient()
    if (!client || !user || !workspace) return

    setLoading(true)
    setLoadError(null)
    try {
      const { data, error } = await client
        .from('saved_items')
        .select('*, message:messages(*, sender:profiles(*))')
        .eq('user_id', user.id)
        .eq('workspace_id', workspace.id)
        .order('created_at', { ascending: false })

      if (error) {
        setLoadError('table_missing')
        return
      }

      if (data) {
        const items = (data as (SavedItem & { message: Message })[]).filter(
          (item) => item.message && !item.message.is_deleted
        )
        setSavedItems(items)
        const ids = new Set(items.map((item) => item.message_id))
        setSavedItemIds(ids)
      }
    } catch {
      setLoadError('table_missing')
    } finally {
      setLoading(false)
    }
  }

  async function handleFix() {
    if (!pat.trim()) return
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const match = supabaseUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)
    if (!match) {
      setFixError('Could not extract project ref from Supabase URL.')
      return
    }
    const projectRef = match[1]

    setFixing(true)
    setFixError(null)
    try {
      const res = await fetch('/api/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectRef, accessToken: pat.trim(), sql: SAVED_ITEMS_SQL }),
      })
      const result = await res.json()

      if (!res.ok) {
        setFixError(result.error || 'Failed to create table')
        return
      }

      // Success — reload
      setShowFix(false)
      setPat('')
      setLoadError(null)
      await loadSavedItems()
    } catch (err) {
      setFixError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setFixing(false)
    }
  }

  async function handleRemove(item: SavedItem) {
    const client = getSupabaseClient()
    if (!client || !user) return

    await client.from('saved_items').delete().eq('id', item.id)
    setSavedItems((prev) => prev.filter((i) => i.id !== item.id))
    toggleSavedItem(item.message_id)
  }

  async function handleGoToMessage(item: SavedItem & { message: Message }) {
    setCurrentChannelId(item.message.channel_id)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div className="relative ml-auto w-full max-w-md bg-white shadow-xl flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid #E5E1EE' }}>
          <div className="flex items-center gap-2">
            <Bookmark className="h-5 w-5" style={{ color: '#7C5CFC' }} />
            <h2 className="font-bold text-[17px]" style={{ color: '#2D2B3D' }}>Saved Items</h2>
            {savedItems.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: '#EDE5FF', color: '#7C5CFC' }}>
                {savedItems.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-[#F5F2FF] transition-colors"
          >
