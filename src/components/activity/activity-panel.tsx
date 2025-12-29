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

  const label = {
    mention: 'mentioned you',
    dm: 'sent you a message',
    reaction: 'reacted to your message',
    thread_reply: 'replied to a thread',
  }[item.type]

  return (
    <button
      onClick={handleClick}
      className="w-full text-left px-4 py-3 transition-colors hover:bg-[#F5F2FF] group"
      style={{
        borderBottom: '1px solid #F0EBFF',
        background: !item.read ? '#EDE5FF' : undefined,
        borderLeft: !item.read ? '3px solid #7C5CFC' : '3px solid transparent',
      }}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        {item.message.sender?.avatar_url ? (
          <img
            src={item.message.sender.avatar_url}
            alt={senderName}
            className="h-9 w-9 rounded-xl object-cover shrink-0"
          />
        ) : (
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
            style={{ background: '#7C5CFC' }}
          >
            {senderInitial}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            {icon}
            <span
              className="text-[13px]"
              style={{ color: '#2D2B3D', fontWeight: !item.read ? 700 : 600 }}
            >
              {senderName}
            </span>
            <span className="text-[12px]" style={{ color: '#8E8EA0' }}>
              {label}
            </span>
          </div>

          <p
            className="text-[13px] truncate"
            style={{ color: !item.read ? '#2D2B3D' : '#4A4860' }}
          >
            {contentPreview}
          </p>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px]" style={{ color: '#8E8EA0' }}>
              #{item.channelName}
            </span>
            <span className="text-[11px]" style={{ color: '#C4C0D0' }}>
              &middot;
            </span>
            <span className="text-[11px]" style={{ color: '#8E8EA0' }}>
              {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
            </span>
          </div>
        </div>

        {!item.read && (
          <div
            className="h-2.5 w-2.5 rounded-full shrink-0 mt-2"
            style={{ background: '#7C5CFC' }}
          />
        )}
      </div>
    </button>
  )
}

export function ActivityPanel() {
  const { activityOpen, activities, closeActivity, markAllActivitiesRead } = useAppStore()
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  // Split into unread and read
  const { unreadItems, readItems } = useMemo(() => {
    const unread: ActivityItem[] = []
    const read: ActivityItem[] = []
    for (const a of activities) {
      if (!a.read) unread.push(a)
      else read.push(a)
    }
    return { unreadItems: unread, readItems: read }
  }, [activities])

  // Combined list: unread first, then read — with pagination
  const allOrdered = useMemo(() => [...unreadItems, ...readItems], [unreadItems, readItems])
  const visibleItems = allOrdered.slice(0, visibleCount)
