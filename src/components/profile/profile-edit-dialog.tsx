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
    }
  }, [open, user])

  /**
   * Resize and compress an image file to max 500x500, output as JPEG.
   */
  function compressImage(file: File, maxSize: number = 500, quality: number = 0.85): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        let { width, height } = img

        // Scale down to fit within maxSize x maxSize, keeping aspect ratio
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height / width) * maxSize)
            width = maxSize
          } else {
            width = Math.round((width / height) * maxSize)
            height = maxSize
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Canvas not supported')); return }
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob)
            else reject(new Error('Compression failed'))
          },
          'image/jpeg',
          quality
        )
      }
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')) }
      img.src = url
    })
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Accept up to 20MB raw — we'll compress it down
    if (file.size > 20 * 1024 * 1024) {
      setError('Image must be less than 20MB')
      return
    }

    setError('')
    setUploading(true)

    try {
      // Compress and resize to max 500x500 JPEG
      const compressed = await compressImage(file, 500, 0.85)

      // Create a preview from the compressed blob
      const previewUrl = URL.createObjectURL(compressed)
      setAvatarPreview(previewUrl)

      // Upload via server-side API route (bypasses RLS)
      const path = `${user.id}.jpg`

      const formData = new FormData()
      formData.append('file', new File([compressed], `${user.id}.jpg`, { type: 'image/jpeg' }))
      formData.append('bucket', 'avatars')
      formData.append('path', path)

      // Include auth header for server-side verification
      const authClient = getSupabaseClient()
      const authSession = authClient ? (await authClient.auth.getSession()).data.session : null
      const uploadHeaders: Record<string, string> = {}
      if (authSession?.access_token) {
        uploadHeaders.Authorization = `Bearer ${authSession.access_token}`
      }

      const res = await fetch('/api/upload', { method: 'POST', body: formData, headers: uploadHeaders })
      const data = await res.json()

      if (!res.ok || !data.publicUrl) {
        throw new Error(data.error || 'Upload failed')
      }

      // Add cache-busting param
      const newUrl = `${data.publicUrl}?t=${Date.now()}`
      setAvatarUrl(newUrl)
    } catch (err) {
      console.error('Upload failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload image.')
      setAvatarPreview(avatarUrl) // Revert preview
    } finally {
      setUploading(false)
    }
  }

  function handleRemoveAvatar() {
    setAvatarUrl(null)
    setAvatarPreview(null)
  }

  async function handleSave() {
    if (!user || !displayName.trim()) {
      setError('Display name is required')
      return
    }

    setSaving(true)
    setError('')

    try {
      const client = getSupabaseClient()
      if (!client) throw new Error('Not connected')

      // Update profile in database
      const { error: updateError } = await client
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          status_emoji: statusEmoji || null,
          status_text: statusText.trim() || null,
