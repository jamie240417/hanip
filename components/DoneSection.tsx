'use client'

import { MessageCircle } from 'lucide-react'

export default function DoneSection() {
  return (
    <section className="mt-8">
      {/* 완독 메시지 */}
      <p className="text-center text-white text-sm mb-6">
        오늘의 경제 뉴스 7입, 맛있게 완독! 🍎
      </p>

      {/* 카카오톡 공유 */}
      <button
        type="button"
        className="w-sm mx-auto flex items-center justify-center gap-1 py-2 px-4 rounded-xl border border-gray-500 bg-transparent text-gray-200 hover:bg-white/5 transition mb-6"
      >
        <span className="text-sm font-medium">
          카카오톡으로 공유하기
        </span>
      </button>
    </section>
  )
}
