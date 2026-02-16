'use client'

import { useRef, useState, useEffect } from 'react'

interface HeaderWithProgressProps {
  scrollRef: React.RefObject<HTMLDivElement | null>
  updateTime?: Date | null
}

function formatUpdateTime(date?: Date | null): string {
  const targetDate = date || new Date()
  const month = targetDate.getMonth() + 1
  const day = targetDate.getDate()
  const hour = targetDate.getHours()
  const ampm = hour >= 12 ? '오후' : '오전'
  const hour12 = hour % 12 || 12
  return `${month}월 ${day}일 ${ampm} ${hour12}시`
}

export default function HeaderWithProgress({ scrollRef, updateTime }: HeaderWithProgressProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const updateProgress = () => {
      const { scrollTop, scrollHeight, clientHeight } = el
      const maxScroll = scrollHeight - clientHeight
      if (maxScroll <= 0) {
        setProgress(100)
        return
      }
      setProgress((scrollTop / maxScroll) * 100)
    }

    updateProgress()
    el.addEventListener('scroll', updateProgress, { passive: true })
    return () => el.removeEventListener('scroll', updateProgress)
  }, [scrollRef])

  return (
    <header className="sticky top-0 z-40 bg-[#0f0f0f] pb-1">
      <div className="flex items-center justify-between px-4 pt-4">
        <h1 className="text-xl font-bold text-white">한입 주식 뉴스</h1>
        {updateTime && (
          <time className="text-xs text-gray-400" dateTime={updateTime.toISOString()}>
            업데이트 {formatUpdateTime(updateTime)}
          </time>
        )}
      </div>
      {/* 스크롤 프로그래스 바 */}
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[#252525]">
        <div
          className="h-full rounded-full bg-accent transition-all duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </header>
  )
}
