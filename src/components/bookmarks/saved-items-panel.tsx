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
