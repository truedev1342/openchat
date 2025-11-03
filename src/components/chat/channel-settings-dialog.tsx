'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, Hash, Lock, UserPlus, LogOut, Trash2, Circle, X, Crown, Bell, BellOff, Pencil, Check, AlertTriangle } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store/app-store'
import type { Channel, Profile } from '@/types/database'

interface ChannelSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  channel: Channel
}

interface MemberWithRole {
  profile: Profile
  role: string
}

export function ChannelSettingsDialog({ open, onOpenChange, channel }: ChannelSettingsDialogProps) {
  const { user, workspace, removeChannel, updateChannel, setCurrentChannelId, channels, mutedChannelIds, muteChannel, unmuteChannel } = useAppStore()
  const [members, setMembers] = useState<MemberWithRole[]>([])
  const [allWorkspaceMembers, setAllWorkspaceMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [memberSearch, setMemberSearch] = useState('')
  const [isMember, setIsMember] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [joining, setJoining] = useState(false)
  const [adding, setAdding] = useState(false)

  // Rename state
  const [isRenaming, setIsRenaming] = useState(false)
  const [newName, setNewName] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [renameError, setRenameError] = useState<string | null>(null)

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Ownership transfer state (shown when creator tries to leave)
  const [showTransfer, setShowTransfer] = useState(false)
  const [transferTarget, setTransferTarget] = useState<string | null>(null)
  const [transferring, setTransferring] = useState(false)

  useEffect(() => {
    if (!open) {
      setIsRenaming(false)
      setShowDeleteConfirm(false)
      setShowTransfer(false)
      setTransferTarget(null)
      setRenameError(null)
      return
    }
    loadMembers()
    loadWorkspaceMembers()
  }, [open, channel.id])

  async function loadMembers() {
    const client = getSupabaseClient()
    if (!client) return

    setLoading(true)
    const { data } = await client
      .from('channel_members')
      .select('profile_id, role, profile:profiles(*)')
      .eq('channel_id', channel.id)

    if (data) {
      const mems = data.map((d) => ({
        profile: d.profile as unknown as Profile,
        role: d.role,
      })).filter((m) => m.profile)

      setMembers(mems)
      setIsMember(mems.some((m) => m.profile.id === user?.id))
    }
    setLoading(false)
  }

  async function loadWorkspaceMembers() {
    const client = getSupabaseClient()
    if (!client || !workspace) return

    const { data } = await client
      .from('workspace_members')
      .select('profile:profiles(*)')
      .eq('workspace_id', workspace.id)

    if (data) {
      const profiles = data
        .map((d: Record<string, unknown>) => d.profile as Profile)
        .filter(Boolean)
      setAllWorkspaceMembers(profiles)
    }
  }

  const nonMembers = allWorkspaceMembers.filter(
    (p) =>
      !members.some((m) => m.profile.id === p.id) &&
      (p.display_name.toLowerCase().includes(memberSearch.toLowerCase()) ||
        p.email?.toLowerCase().includes(memberSearch.toLowerCase()))
  )

  function formatChannelName(value: string) {
    return value
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_]/g, '')
  }

  async function handleRename() {
    const client = getSupabaseClient()
    if (!client || !newName.trim()) return

    const formatted = formatChannelName(newName)
    if (!formatted || formatted === channel.name) {
      setIsRenaming(false)
      return
    }

    setRenaming(true)
    setRenameError(null)

    try {
      const { error } = await client
        .from('channels')
        .update({ name: formatted })
        .eq('id', channel.id)

      if (error) throw error

      updateChannel(channel.id, { name: formatted })
      setIsRenaming(false)
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : 'Failed to rename')
    }
    setRenaming(false)
  }

  async function handleDeleteChannel() {
    const client = getSupabaseClient()
    if (!client) return

    setDeleting(true)
    try {
      // Delete all channel members first
      await client
        .from('channel_members')
        .delete()
        .eq('channel_id', channel.id)

      // Archive channel (soft delete - set is_archived)
      await client
        .from('channels')
        .update({ is_archived: true })
        .eq('id', channel.id)

      removeChannel(channel.id)

      // Switch to first available channel
      const remaining = channels.filter((c) => c.id !== channel.id && !c.name.startsWith('dm-'))
      if (remaining.length > 0) {
        setCurrentChannelId(remaining[0].id)
      }

      onOpenChange(false)
    } catch (err) {
      console.error('Failed to delete channel:', err)
    }
    setDeleting(false)
  }

  async function handleJoinChannel() {
    const client = getSupabaseClient()
    if (!client || !user) return

    setJoining(true)
    try {
      await client.from('channel_members').insert({
        channel_id: channel.id,
        profile_id: user.id,
        role: 'member',
      })
      setIsMember(true)
      await loadMembers()
    } catch (err) {
      console.error('Failed to join:', err)
    }
    setJoining(false)
  }

  async function handleLeaveChannel() {
    // If creator, show ownership transfer dialog
    if (isCreator) {
      const otherMembers = members.filter((m) => m.profile.id !== user?.id)
      if (otherMembers.length > 0) {
        setShowTransfer(true)
        return
      }
      // If no other members, just delete the channel
      await handleDeleteChannel()
      return
    }

    const client = getSupabaseClient()
    if (!client || !user) return

    setLeaving(true)
    try {
      await client
        .from('channel_members')
        .delete()
        .eq('channel_id', channel.id)
        .eq('profile_id', user.id)

      removeChannel(channel.id)

      const remaining = channels.filter((c) => c.id !== channel.id && !c.name.startsWith('dm-'))
      if (remaining.length > 0) {
        setCurrentChannelId(remaining[0].id)
      }

      onOpenChange(false)
    } catch (err) {
      console.error('Failed to leave:', err)
    }
    setLeaving(false)
  }

  async function handleTransferAndLeave() {
    if (!transferTarget) return
    const client = getSupabaseClient()
    if (!client || !user) return

    setTransferring(true)
    try {
      // Transfer ownership: update created_by and set new owner as admin
      await client
        .from('channels')
        .update({ created_by: transferTarget })
        .eq('id', channel.id)

      await client
        .from('channel_members')
        .update({ role: 'admin' })
        .eq('channel_id', channel.id)
        .eq('profile_id', transferTarget)

      // Now leave
      await client
        .from('channel_members')
        .delete()
        .eq('channel_id', channel.id)
        .eq('profile_id', user.id)

      removeChannel(channel.id)

      const remaining = channels.filter((c) => c.id !== channel.id && !c.name.startsWith('dm-'))
      if (remaining.length > 0) {
        setCurrentChannelId(remaining[0].id)
      }

      onOpenChange(false)
    } catch (err) {
      console.error('Failed to transfer ownership:', err)
    }
    setTransferring(false)
  }

  async function handleAddMember(profile: Profile) {
    const client = getSupabaseClient()
    if (!client) return

    setAdding(true)
    try {
      await client.from('channel_members').insert({
        channel_id: channel.id,
        profile_id: profile.id,
        role: 'member',
      })
      setMemberSearch('')
      await loadMembers()
    } catch (err) {
      console.error('Failed to add member:', err)
    }
    setAdding(false)
  }

  async function handleRemoveMember(profileId: string) {
    const client = getSupabaseClient()
    if (!client) return

    try {
      await client
        .from('channel_members')
        .delete()
        .eq('channel_id', channel.id)
        .eq('profile_id', profileId)

      await loadMembers()
    } catch (err) {
      console.error('Failed to remove member:', err)
    }
  }

  const currentUserRole = members.find((m) => m.profile.id === user?.id)?.role
  const isAdmin = currentUserRole === 'admin'
  const isCreator = channel.created_by === user?.id
  const isMuted = mutedChannelIds.includes(channel.id)
  const otherMembers = members.filter((m) => m.profile.id !== user?.id)

  // Ownership transfer view
  if (showTransfer) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
