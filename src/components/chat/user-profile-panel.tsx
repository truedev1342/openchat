'use client'

import { useEffect, useState } from 'react'
import { X, Mail, Clock, Circle, MessageSquare, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store/app-store'
import { ProfileEditDialog } from '@/components/profile/profile-edit-dialog'
import { formatDistanceToNow } from 'date-fns'
import type { Profile } from '@/types/database'

export function UserProfilePanel() {
  const { user, profileUserId, closeProfile, workspace } = useAppStore()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)

  const isOwnProfile = user?.id === profileUserId

  useEffect(() => {
    if (!profileUserId) return
    const client = getSupabaseClient()
    if (!client) return

    setLoading(true)

    client
      .from('profiles')
      .select('*')
      .eq('id', profileUserId)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data as Profile)
        setLoading(false)
      })

    if (workspace) {
      client
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspace.id)
        .eq('profile_id', profileUserId)
        .single()
        .then(({ data }) => {
          if (data) setRole(data.role)
        })
    }
  }, [profileUserId, workspace])

  useEffect(() => {
