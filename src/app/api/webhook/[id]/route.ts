import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    // Use service key if available, otherwise anon key
    const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey)

    // Look up the incoming webhook
    const { data: webhook, error: webhookError } = await supabase
      .from('incoming_webhooks')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
