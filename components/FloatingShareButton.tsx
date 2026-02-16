'use client'

import { Share2 } from 'lucide-react'

export default function FloatingShareButton() {
  return (
    <button
      type="button"
      className="fixed bottom-28 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white shadow-lg transition hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-[#0f0f0f]"
      aria-label="공유하기"
    >
      <Share2 className="h-5 w-5" />
    </button>
  )
}
