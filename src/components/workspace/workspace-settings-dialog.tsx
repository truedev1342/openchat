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
import {
  Loader2,
  Settings,
  Circle,
  Crown,
  Shield,
  ShieldCheck,
  UserMinus,
  Check,
  X,
  UserX,
  Video,
  ExternalLink,
  Webhook,
  Bot,
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store/app-store'
import { WebhookSettings } from './webhook-settings'
import { BotSettings } from './bot-settings'
import type { Profile, WorkspaceSettings } from '@/types/database'

interface WorkspaceSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface MemberWithRole {
  profile: Profile
  role: 'owner' | 'admin' | 'member'
}

interface LiveKitConfig {
  livekit_url: string
  livekit_api_key: string
  livekit_api_secret: string
  calls_enabled: boolean
}

export function WorkspaceSettingsDialog({ open, onOpenChange }: WorkspaceSettingsDialogProps) {
  const { user, workspace, workspaceRole, setWorkspace } = useAppStore()
  const [members, setMembers] = useState<MemberWithRole[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Tabs
  const [activeTab, setActiveTab] = useState<'general' | 'webhooks' | 'bots'>('general')

  // Confirm remove member
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)

  // LiveKit config
  const [livekitConfig, setLivekitConfig] = useState<LiveKitConfig>({
    livekit_url: '',
    livekit_api_key: '',
    livekit_api_secret: '',
    calls_enabled: false,
  })
  const [savingLivekit, setSavingLivekit] = useState(false)
