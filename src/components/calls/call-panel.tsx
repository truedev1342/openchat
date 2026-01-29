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
          is_muted: isMuted,
          is_camera_on: isCameraOn,
          is_sharing_screen: isScreenSharing,
        })
        .eq('call_id', activeCall.id)
        .eq('profile_id', user.id)
    } catch {
      // ignore
    }
  }, [isMuted, isCameraOn, isScreenSharing, user, activeCall])

  useEffect(() => {
    updateParticipantState()
  }, [updateParticipantState])

  async function toggleMute() {
    try {
      await localParticipant.setMicrophoneEnabled(isMuted)
      setIsMuted(!isMuted)
    } catch (err) {
      console.error('Failed to toggle mute:', err)
    }
  }

  async function toggleCamera() {
    try {
      await localParticipant.setCameraEnabled(!isCameraOn)
      setIsCameraOn(!isCameraOn)
    } catch (err) {
      console.error('Failed to toggle camera:', err)
    }
  }

  async function toggleScreenShare() {
    try {
      await localParticipant.setScreenShareEnabled(!isScreenSharing)
      setIsScreenSharing(!isScreenSharing)
    } catch (err) {
      console.error('Failed to toggle screen share:', err)
    }
  }

  async function handleLeave() {
    const client = getSupabaseClient()
    if (client && user && activeCall) {
      // Mark participant as left
      await client
        .from('call_participants')
        .update({ left_at: new Date().toISOString() })
        .eq('call_id', activeCall.id)
        .eq('profile_id', user.id)

      // If last participant, end the call
      const { data: remaining } = await client
        .from('call_participants')
        .select('profile_id')
        .eq('call_id', activeCall.id)
        .is('left_at', null)

      if (!remaining || remaining.length <= 1) {
        await client
          .from('active_calls')
          .update({ ended_at: new Date().toISOString() })
          .eq('id', activeCall.id)
      }
    }

    room.disconnect()
    leaveCall()
  }

  const videoTracks = tracks.filter(
    (t): t is TrackReference => t.source === Track.Source.Camera && isTrackReference(t)
  )
  const screenTracks = tracks.filter(
    (t): t is TrackReference => t.source === Track.Source.ScreenShare && isTrackReference(t)
  )
  const audioTracks = tracks.filter(
    (t): t is TrackReference => t.source === Track.Source.Microphone && isTrackReference(t)
  )

  if (!isExpanded) {
    // Minimized bar at bottom
    return (
      <div
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl"
        style={{ background: '#2D2B3D' }}
      >
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full animate-pulse" style={{ background: '#4ADE80' }} />
          <span className="text-white text-sm font-medium">#{channelName}</span>
          <span className="text-sm" style={{ color: '#8E8EA0' }}>
            <Users className="h-3 w-3 inline mr-1" />
            {participants.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleMute}
            className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: isMuted ? '#E55B5B' : 'rgba(255,255,255,0.1)' }}
          >
            {isMuted ? (
              <MicOff className="h-4 w-4 text-white" />
            ) : (
              <Mic className="h-4 w-4 text-white" />
            )}
          </button>
          <button
            onClick={toggleCamera}
            className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: isCameraOn ? '#7C5CFC' : 'rgba(255,255,255,0.1)' }}
          >
            {isCameraOn ? (
              <Video className="h-4 w-4 text-white" />
            ) : (
              <VideoOff className="h-4 w-4 text-white" />
            )}
          </button>
          <button
            onClick={() => setIsExpanded(true)}
            className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
          >
            <Maximize2 className="h-4 w-4 text-white" />
          </button>
          <button
            onClick={handleLeave}
            className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: '#E55B5B' }}
          >
            <PhoneOff className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full animate-pulse" style={{ background: '#4ADE80' }} />
          <span className="text-white font-semibold text-lg">#{channelName}</span>
