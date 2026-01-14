'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  LiveKitRoom,
  VideoTrack,
  AudioTrack,
  useParticipants,
  useTracks,
  useLocalParticipant,
  useRoomContext,
  isTrackReference,
  type TrackReference,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import { useAppStore } from '@/lib/store/app-store'
import { getSupabaseClient } from '@/lib/supabase/client'
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  PhoneOff,
  Maximize2,
  Minimize2,
  Users,
  Loader2,
} from 'lucide-react'
import type { ActiveCall, CallParticipant } from '@/types/database'

export function CallPanel() {
  const {
    user,
    workspace,
    activeCall,
    callToken,
    callUrl,
    isInCall,
    leaveCall,
    channels,
  } = useAppStore()

  if (!isInCall || !activeCall || !callToken || !callUrl) {
    return null
  }

  const channelName = channels.find((c) => c.id === activeCall.channel_id)?.name || 'Unknown'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <LiveKitRoom
        serverUrl={callUrl}
        token={callToken}
        connect={true}
        audio={true}
        video={false}
        onDisconnected={() => {
          leaveCall()
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <CallContent channelName={channelName} />
      </LiveKitRoom>
    </div>
  )
}

function CallContent({ channelName }: { channelName: string }) {
  const { user, activeCall, leaveCall } = useAppStore()
  const participants = useParticipants()
  const { localParticipant } = useLocalParticipant()
  const room = useRoomContext()
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
      { source: Track.Source.Microphone, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  )

  // Update participant state in Supabase
  const updateParticipantState = useCallback(async () => {
    const client = getSupabaseClient()
    if (!client || !user || !activeCall) return

    try {
      await client
        .from('call_participants')
        .update({
