'use client'

import { useAppStore } from '@/lib/store/app-store'
import { ChannelView } from '@/components/chat/channel-view'
import { Hash } from 'lucide-react'

export default function WorkspacePage() {
  const { channels, dmChannels, currentChannelId, previewChannel } = useAppStore()

  // Preview mode: viewing a channel the user hasn't joined yet
  if (previewChannel) {
    return <ChannelView channel={previewChannel} isPreview />
  }

  const currentChannel =
