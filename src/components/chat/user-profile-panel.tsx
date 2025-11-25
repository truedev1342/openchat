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
    if (isOwnProfile && user) {
      setProfile(user)
    }
  }, [isOwnProfile, user])

  if (!profileUserId) return null

  const displayName = profile?.display_name || 'Loading...'
  const initial = displayName[0]?.toUpperCase() || '?'
  const isOnline = profile?.is_online ?? false

  return (
    <>
      <div className="w-80 flex flex-col h-full shrink-0" style={{ background: '#ffffff', borderLeft: '1px solid #E5E1EE' }}>
        {/* Header */}
        <div className="px-5 py-3 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid #E5E1EE' }}>
          <h3 className="font-bold text-[17px]" style={{ color: '#2D2B3D' }}>Profile</h3>
          <button className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-[#F5F2FF] transition-colors" onClick={closeProfile}>
            <X className="h-4 w-4" style={{ color: '#8E8EA0' }} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-sm" style={{ color: '#8E8EA0' }}>
            Loading profile...
          </div>
        ) : profile ? (
          <div className="flex-1 overflow-y-auto">
            {/* Avatar + name */}
            <div className="flex flex-col items-center pt-8 pb-4 px-4">
              <div className="relative mb-3">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={displayName}
                    className="h-[120px] w-[120px] rounded-2xl object-cover shadow-sm"
                  />
                ) : (
                  <div className="h-[120px] w-[120px] rounded-2xl flex items-center justify-center text-4xl font-bold text-white shadow-sm" style={{ background: '#7C5CFC' }}>
                    {initial}
                  </div>
                )}
                <div className="absolute bottom-1.5 right-1.5">
                  <Circle
                    className={`h-4 w-4 ${
                      isOnline ? 'fill-green-500 text-green-500' : 'fill-gray-300 text-gray-300'
                    }`}
                    strokeWidth={3}
                    stroke="#ffffff"
                  />
                </div>
