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
