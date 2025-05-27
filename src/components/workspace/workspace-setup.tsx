'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Loader2 } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Workspace, Channel } from '@/types/database'

interface WorkspaceSetupProps {
  onCreated: (workspace: Workspace) => void
}

export function WorkspaceSetup({ onCreated }: WorkspaceSetupProps) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const client = getSupabaseClient()
    if (!client || !name.trim()) return

    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await client.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const slug = name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')

      // Generate workspace ID client-side so we can reference it immediately
      const workspaceId = crypto.randomUUID()

      // Create workspace (no .select() — RLS SELECT policy requires membership first)
      const { error: wsError } = await client
        .from('workspaces')
        .insert({ id: workspaceId, name: name.trim(), slug })

      if (wsError) throw wsError

      // Add self as owner (must happen before any SELECT on workspaces)
