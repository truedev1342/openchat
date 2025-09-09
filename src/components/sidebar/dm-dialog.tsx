'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store/app-store'
import { Circle, Search, X, Users, Check } from 'lucide-react'
import type { Profile, Channel } from '@/types/database'

interface DmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DmDialog({ open, onOpenChange }: DmDialogProps) {
  const { user, workspace, setCurrentChannelId, addDmChannel, unhideDm, dmChannels, hiddenDmIds } = useAppStore()
  const [members, setMembers] = useState<Profile[]>([])
  const [selectedMembers, setSelectedMembers] = useState<Profile[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !workspace) return
    setSelectedMembers([])
    setSearch('')
    const client = getSupabaseClient()
    if (!client) return

    client
      .from('workspace_members')
      .select('profile:profiles(*)')
      .eq('workspace_id', workspace.id)
      .then(({ data }) => {
        if (data) {
          const profiles = data
            .map((d: Record<string, unknown>) => d.profile as Profile)
            .filter((p) => p && p.id !== user?.id)
          setMembers(profiles)
        }
      })
  }, [open, workspace, user])

  const filtered = members.filter((m) =>
    (m.display_name.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase())) &&
    !selectedMembers.some(s => s.id === m.id)
  )

  function toggleMember(member: Profile) {
    setSelectedMembers(prev => {
      const exists = prev.some(m => m.id === member.id)
      if (exists) return prev.filter(m => m.id !== member.id)
      return [...prev, member]
    })
    setSearch('')
  }

  async function startDm(otherUser: Profile) {
    const client = getSupabaseClient()
    if (!client || !user || !workspace) return

    setLoading(true)

    try {
      const ids = [user.id, otherUser.id].sort()
      const dmName = `dm-${ids[0].slice(0, 8)}-${ids[1].slice(0, 8)}`

      const { data: existing } = await client
        .from('channels')
        .select('*')
        .eq('workspace_id', workspace.id)
        .eq('name', dmName)
        .limit(1)

      let channelId: string

