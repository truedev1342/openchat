'use client'

import { useState, useMemo } from 'react'
import { useAppStore } from '@/lib/store/app-store'
import type { ActivityItem } from '@/lib/store/app-store'
import { X, Bell, AtSign, MessageSquare, Heart, CheckCheck, ChevronDown } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const PAGE_SIZE = 20

function ActivityItemRow({ item, onNavigate }: { item: ActivityItem; onNavigate: () => void }) {
  const { setCurrentChannelId, closeActivity, markActivityRead } = useAppStore()

  const senderName = item.message.sender?.display_name || 'Someone'
  const senderInitial = senderName[0]?.toUpperCase() || '?'
  const contentPreview = item.message.content
    .replace(/@[a-f0-9-]+/g, '@user')
    .slice(0, 120)

  function handleClick() {
    if (!item.read) markActivityRead(item.id)
    setCurrentChannelId(item.channelId)
    closeActivity()
    onNavigate()
  }

  const icon = {
    mention: <AtSign className="h-3.5 w-3.5" style={{ color: '#7C5CFC' }} />,
    dm: <MessageSquare className="h-3.5 w-3.5" style={{ color: '#7C5CFC' }} />,
    reaction: <Heart className="h-3.5 w-3.5" style={{ color: '#E55B5B' }} />,
    thread_reply: <MessageSquare className="h-3.5 w-3.5" style={{ color: '#7C5CFC' }} />,
  }[item.type]
