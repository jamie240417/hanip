'use client'

import { TrendingUp } from 'lucide-react'
import type { NewsItem } from '@/lib/types'

interface NewsCardProps {
  item: NewsItem
}

export default function NewsCard({ item }: NewsCardProps) {
  return (
    <article className="rounded-2xl bg-card-bg p-4 sm:p-5 shadow-lg">
      {/* 뱃지 */}
      <span className="inline-block px-2 py-1 rounded-full bg-accent text-white text-sm font-medium mb-3">
        {item.rank}
      </span>

      {/* 제목 (차트 아이콘 + 제목) */}
      <h2 className="flex items-start gap-2 text-lg font-bold text-white leading-snug mb-4">
        <TrendingUp className="shrink-0 w-5 h-5 text-accent mt-0.5" aria-hidden />
        <span>{item.title}</span>
      </h2>

      {/* ① 무슨 일? */}
      <section className="mb-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-1.5">① 무슨 일?</h3>
        <p className="text-sm text-gray-200 leading-relaxed">{item.fact}</p>
      </section>

      {/* ② 왜? */}
      <section className="mb-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-1.5">② 왜?</h3>
        <p className="text-sm text-gray-200 leading-relaxed">{item.reason}</p>
      </section>

      {/* ③ 영향은? */}
      <section>
        <h3 className="text-sm font-semibold text-gray-400 mb-1.5">③ 영향은?</h3>
        <p className="text-sm text-gray-200 leading-relaxed">{item.impact}</p>
      </section>
    </article>
  )
}
