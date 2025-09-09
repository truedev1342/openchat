'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, Hash, Lock, X, Circle } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store/app-store'
import type { Channel, Profile } from '@/types/database'

interface CreateChannelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateChannelDialog({ open, onOpenChange }: CreateChannelDialogProps) {
  const { workspace, user, addChannel, setCurrentChannelId } = useAppStore()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Member invite
  const [allMembers, setAllMembers] = useState<Profile[]>([])
  const [memberSearch, setMemberSearch] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<Profile[]>([])

  useEffect(() => {
    if (!open || !workspace) return
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
          setAllMembers(profiles)
        }
      })
  }, [open, workspace, user])

  // Reset on close
  useEffect(() => {
    if (!open) {
      setName('')
      setDescription('')
      setIsPrivate(false)
      setSelectedMembers([])
      setMemberSearch('')
      setError(null)
    }
  }, [open])

  function formatChannelName(value: string) {
    return value
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_]/g, '')
  }

  const filteredMembers = allMembers.filter(
    (m) =>
      !selectedMembers.some((s) => s.id === m.id) &&
      (m.display_name.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.email?.toLowerCase().includes(memberSearch.toLowerCase()))
  )

  function addMember(member: Profile) {
    setSelectedMembers((prev) => [...prev, member])
    setMemberSearch('')
  }

  function removeMember(memberId: string) {
    setSelectedMembers((prev) => prev.filter((m) => m.id !== memberId))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const client = getSupabaseClient()
    if (!client || !workspace || !user) return

    const channelName = formatChannelName(name)
    if (!channelName) return

    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await client.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // Create channel
      const { data: channel, error: chError } = await client
        .from('channels')
        .insert({
          workspace_id: workspace.id,
          name: channelName,
          description: description.trim() || null,
          is_private: isPrivate,
          created_by: session.user.id,
        })
        .select()
        .single()

      if (chError) throw chError

      // Add creator as channel admin
      await client.from('channel_members').insert({
        channel_id: channel.id,
        profile_id: session.user.id,
        role: 'admin',
      })

      // Add selected members
      if (selectedMembers.length > 0) {
        await client.from('channel_members').insert(
          selectedMembers.map((m) => ({
            channel_id: channel.id,
            profile_id: m.id,
            role: 'member',
          }))
        )
      }

      addChannel(channel as Channel)
      setCurrentChannelId(channel.id)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create channel')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a channel</DialogTitle>
          <DialogDescription>
            Channels are where your team communicates. They&apos;re best organized around a topic.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          {/* Channel name */}
          <div className="space-y-2">
            <Label htmlFor="ch-name">Name</Label>
            <div className="relative">
              {isPrivate ? (
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              ) : (
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              )}
              <Input
                id="ch-name"
                placeholder="e.g. marketing"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-9"
                required
              />
            </div>
            {name && (
              <p className="text-xs text-muted-foreground">
                Channel will be created as <span className="font-mono">{isPrivate ? '🔒' : '#'}{formatChannelName(name)}</span>
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="ch-desc">Description <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              id="ch-desc"
              placeholder="What is this channel about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Visibility toggle */}
          <div className="space-y-2">
            <Label>Visibility</Label>
            <div className="flex gap-2">
