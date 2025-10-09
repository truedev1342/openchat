'use client'

import { useState } from 'react'

const EMOJI_CATEGORIES = [
  {
    name: 'Smileys',
    emojis: ['😀', '😂', '🥲', '😊', '😍', '🥰', '😎', '🤩', '😜', '🤔', '😏', '😅', '😢', '😭', '😤', '🤯', '🥳', '😴', '🙄', '😬'],
  },
  {
    name: 'Gestures',
    emojis: ['👍', '👎', '👏', '🙌', '🤝', '✌️', '🤞', '💪', '👀', '🫡', '🙏', '❤️', '🔥', '⭐', '💯', '✅', '❌', '⚡', '🎉', '🚀'],
  },
  {
    name: 'Objects',
    emojis: ['💡', '📌', '📎', '🔗', '📝', '📊', '🎯', '🏆', '💰', '⏰', '📢', '🔔', '💬', '🔧', '🎨', '📦', '🧪', '🐛', '🏗️', '🚢'],
  },
]

// Quick reactions shown on message hover
export const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '👀', '🚀']

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  onClose: () => void
}
