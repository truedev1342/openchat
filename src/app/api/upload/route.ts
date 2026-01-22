import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Allowed MIME types for uploads
const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  // Documents
  'application/pdf', 'text/plain', 'text/csv',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Archives
  'application/zip', 'application/gzip',
  // Audio/Video
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'video/mp4', 'video/webm',
  // Code
  'application/json', 'application/xml', 'text/html', 'text/css', 'text/javascript',
])

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB
const MAX_AVATAR_SIZE = 5 * 1024 * 1024 // 5 MB

// POST: Upload a file to Supabase Storage using the service role key
export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
