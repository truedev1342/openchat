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

      if (existing && existing.length > 0) {
        channelId = existing[0].id
        if (hiddenDmIds.includes(channelId)) {
          unhideDm(channelId)
        }
      } else {
        const id = crypto.randomUUID()
        const { error } = await client.from('channels').insert({
          id,
          workspace_id: workspace.id,
          name: dmName,
          description: `Direct message between ${user.display_name} and ${otherUser.display_name}`,
          is_private: true,
          created_by: user.id,
        })
        if (error) throw error

        const { error: memberError } = await client.from('channel_members').insert([
          { channel_id: id, profile_id: user.id, role: 'admin' },
          { channel_id: id, profile_id: otherUser.id, role: 'admin' },
        ])
        if (memberError) throw memberError
        channelId = id
      }

      const { data: channelData } = await client
        .from('channels')
        .select('*')
        .eq('id', channelId)
        .single()

      if (channelData) {
        addDmChannel({ ...channelData, otherUser })
      }

      setCurrentChannelId(channelId)
      onOpenChange(false)
      setSearch('')
    } catch (err) {
      console.error('Failed to start DM:', err)
    } finally {
      setLoading(false)
    }
  }

  async function startGroupDm() {
    const client = getSupabaseClient()
    if (!client || !user || !workspace || selectedMembers.length < 2) return

    setLoading(true)

    try {
      const id = crypto.randomUUID()
      const gdmName = `gdm-${id.slice(0, 12)}`
      const memberNames = selectedMembers.map(m => m.display_name).join(', ')

      const { error } = await client.from('channels').insert({
        id,
        workspace_id: workspace.id,
        name: gdmName,
        description: `Group DM: ${user.display_name}, ${memberNames}`,
        is_private: true,
        created_by: user.id,
      })
      if (error) throw error

      // Add all members including current user
      const memberInserts = [
        { channel_id: id, profile_id: user.id, role: 'admin' },
        ...selectedMembers.map(m => ({
          channel_id: id,
          profile_id: m.id,
          role: 'member' as string,
        })),
      ]
      await client.from('channel_members').insert(memberInserts)

      const { data: channelData } = await client
