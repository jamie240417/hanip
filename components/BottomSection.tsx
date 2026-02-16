'use client'

import { Mail } from 'lucide-react'
import { useState } from 'react'

export default function BottomSection() {
  const [email, setEmail] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    alert(`이메일 구독 요청: ${email}`)
  }

  return (
    <footer className="bg-footer-bg rounded-t-3xl px-4 pt-8 pb-10 mt-8">
      {/* 이메일 구독 폼 */}
      <div className="flex flex-col items-center">
        <Mail className="w-12 h-12 text-gray-400 mb-3" aria-hidden />
        <p className="text-center text-white text-sm leading-relaxed mb-4">
          아침 8시, 수익을 부르는 &apos;한 입&apos; 메일로
          <br />
          배달해 드릴까요?
        </p>
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일 주소를 입력해주세요"
            className="w-full rounded-xl bg-input-bg border border-gray-600 px-4 py-3 text-white placeholder-gray-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            aria-label="이메일 주소"
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-accent py-3.5 text-white font-medium hover:bg-accent/90 transition"
          >
            한 입 소식받기
          </button>
        </form>
      </div>
    </footer>
  )
}


