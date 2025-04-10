'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isConfigured, getSupabaseClient } from '@/lib/supabase/client'
import { Loader2, MessageSquare } from 'lucide-react'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    async function checkState() {
      // Check if Supabase is configured
      if (!isConfigured()) {
        router.replace('/setup')
        return
      }

      // Check if user is authenticated
      const client = getSupabaseClient()
      if (!client) {
        router.replace('/setup')
        return
