'use client'

import { useState, useRef, useEffect } from 'react'
import { Camera, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store/app-store'

interface ProfileEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProfileEditDialog({ open, onOpenChange }: ProfileEditDialogProps) {
  const { user, setUser } = useAppStore()
  const [displayName, setDisplayName] = useState('')
  const [statusEmoji, setStatusEmoji] = useState('')
  const [statusText, setStatusText] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load current user data when dialog opens
  useEffect(() => {
    if (open && user) {
      setDisplayName(user.display_name || '')
      setStatusEmoji(user.status_emoji || '')
      setStatusText(user.status_text || '')
      setAvatarUrl(user.avatar_url)
      setAvatarPreview(user.avatar_url)
      setError('')
