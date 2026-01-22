import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST: Create storage buckets (avatars, attachments)
export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase URL or service role key. Please configure these in your .env.local file.' },
      { status: 400 }
    )
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const results: Record<string, string> = {}

  // Create 'avatars' bucket
  const { error: avatarsError } = await supabase.storage.createBucket('avatars', {
    public: true,
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  })
  if (avatarsError) {
    if (avatarsError.message?.includes('already exists')) {
      results.avatars = 'already exists'
    } else {
      results.avatars = `error: ${avatarsError.message}`
    }
  } else {
    results.avatars = 'created'
  }

  // Create 'attachments' bucket
