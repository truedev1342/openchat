'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Phone, X } from 'lucide-react'
import { useAppStore } from '@/lib/store/app-store'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { ActiveCall } from '@/types/database'

export function IncomingCallBanner() {
  const { user, channels, dmChannels, channelActiveCalls, isInCall, joinCall, setChannelActiveCall } = useAppStore()
  const [incomingCall, setIncomingCall] = useState<{ call: ActiveCall; callerName: string; channelName: string } | null>(null)
  const [dismissedCallIds, setDismissedCallIds] = useState<Set<string>>(new Set())
  const [joining, setJoining] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const ringtoneIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Play ringtone using Web Audio API
  const startRingtone = useCallback(() => {
    try {
      const ctx = new AudioContext()
      audioContextRef.current = ctx

      // Create a ringing pattern: beep-beep ... beep-beep
      let beepCount = 0

      function playBeep() {
        if (!audioContextRef.current) return
        const osc = audioContextRef.current.createOscillator()
        const gain = audioContextRef.current.createGain()

        osc.connect(gain)
        gain.connect(audioContextRef.current.destination)
