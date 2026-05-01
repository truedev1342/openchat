'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Clock, Calendar } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store/app-store'

interface ScheduleMessageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  content: string
  channelId: string
  onScheduled: () => void
}

export function ScheduleMessageDialog({ open, onOpenChange, content, channelId, onScheduled }: ScheduleMessageDialogProps) {
  const { user, workspace } = useAppStore()
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [scheduling, setScheduling] = useState(false)

  // Preset options
