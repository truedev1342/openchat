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
import { Loader2, Mail, Check, Copy, Link2, Send, Key, AlertTriangle, Info } from 'lucide-react'
import { useAppStore } from '@/lib/store/app-store'
import { getSupabaseClient } from '@/lib/supabase/client'

interface InviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InviteDialog({ open, onOpenChange }: InviteDialogProps) {
  const { workspace } = useAppStore()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [hasServiceKey, setHasServiceKey] = useState<boolean | null>(null)
  const [serviceKey, setServiceKey] = useState('')
  const [savingKey, setSavingKey] = useState(false)
  const [needsRestart, setNeedsRestart] = useState(false)

  const inviteLink = typeof window !== 'undefined'
    ? `${window.location.origin}/auth?workspace=${workspace?.id}`
    : ''

  // Check if service key is configured
  useEffect(() => {
    if (open) {
      fetch('/api/setup')
        .then((r) => r.json())
        .then((data) => setHasServiceKey(data.hasServiceKey ?? false))
        .catch(() => setHasServiceKey(false))
    }
  }, [open])

  async function handleSaveServiceKey() {
    if (!serviceKey.trim()) return
    setSavingKey(true)
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceRoleKey: serviceKey.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setNeedsRestart(true)
      } else {
        setError(data.error || 'Failed to save')
      }
    } catch {
      setError('Failed to save service key')
    } finally {
      setSavingKey(false)
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !workspace) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Get auth session for server-side verification
      const authClient = getSupabaseClient()
      const authSession = authClient ? (await authClient.auth.getSession()).data.session : null

      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authSession?.access_token ? { Authorization: `Bearer ${authSession.access_token}` } : {}),
        },
        body: JSON.stringify({
          email: email.trim(),
          workspaceId: workspace.id,
          workspaceName: workspace.name,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to invite')
        return
      }

      if (data.added) {
        setSuccess(`✅ ${data.displayName || email} has been added to ${workspace.name}!`)
      } else if (data.invited) {
        setSuccess(`📧 Invitation email sent to ${email.trim()}! They'll join ${workspace.name} when they accept.`)
      }

      setEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invite')
    } finally {
      setLoading(false)
    }
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Service key setup needed
  if (hasServiceKey === false && !needsRestart) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Setup email invitations</DialogTitle>
            <DialogDescription>
              To send invite emails, OpenChat needs your Supabase <strong>service_role key</strong>. This is stored server-side only and never exposed to the browser.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="service-key">Service Role Key</Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="service-key"
                  type="password"
                  placeholder="eyJhbGci..."
                  value={serviceKey}
                  onChange={(e) => setServiceKey(e.target.value)}
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Supabase Dashboard → Settings → API → service_role (secret)
              </p>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSaveServiceKey} disabled={savingKey || !serviceKey.trim()}>
                {savingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save & Enable'}
              </Button>
            </div>

            <div className="border-t pt-3 space-y-2">
              <p className="text-xs text-muted-foreground">Or share the invite link manually:</p>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-muted rounded-md text-xs text-muted-foreground truncate">
                  <Link2 className="h-3 w-3 shrink-0" />
                  <span className="truncate">{inviteLink}</span>
