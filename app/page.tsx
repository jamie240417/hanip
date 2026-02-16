'use client'

import { useRef, useEffect, useState } from 'react'
import HeaderWithProgress from '@/components/HeaderWithProgress'
import NewsCard from '@/components/NewsCard'
import BottomSection from '@/components/BottomSection'
import DoneSection from '@/components/DoneSection'
import FloatingShareButton from '@/components/FloatingShareButton'
import { supabase } from '@/lib/supabase'
import { dummyNews } from '@/lib/dummy-news'
import type { NewsItem } from '@/lib/types'

// rank 순서 정의
const RANK_ORDER: Record<string, number> = {
  '한입': 1,
  '두입': 2,
  '세입': 3,
  '네입': 4,
  '다섯입': 5,
  '여섯입': 6,
  '일곱입': 7,
}

export default function Home() {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [newsItems, setNewsItems] = useState<NewsItem[]>([])
  const [latestUpdateTime, setLatestUpdateTime] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchNews() {
      try {
        console.log('뉴스 데이터 가져오기 시작...')
        console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '설정됨' : '없음')
        
        const { data, error } = await supabase
          .from('news')
          .select('*')
          .order('created_at', { ascending: false })

        console.log('Supabase 응답:', { data, error })

        if (error) {
          console.error('뉴스 데이터 가져오기 실패:', error)
          console.error('에러 상세:', JSON.stringify(error, null, 2))
          // 에러 발생 시 더미 데이터 표시
          console.log('에러 발생으로 더미 데이터를 표시합니다.')
          setNewsItems(dummyNews)
          setLatestUpdateTime(new Date())
          setLoading(false)
          return
        }

        console.log('가져온 데이터 개수:', data?.length || 0)

        if (data && data.length > 0) {
          console.log('첫 번째 데이터 샘플:', data[0])
          
          // created_at 기준 최신순으로 정렬 (이미 정렬됨)
          // rank에 따라 정렬 (rank가 숫자인 경우도 처리)
          const sortedData = [...data].sort((a, b) => {
            // rank가 숫자인 경우 그대로 사용, 문자열인 경우 RANK_ORDER에서 찾기
            const rankA = typeof a.rank === 'number' 
              ? a.rank 
              : (RANK_ORDER[a.rank as string] || 999)
            const rankB = typeof b.rank === 'number'
              ? b.rank
              : (RANK_ORDER[b.rank as string] || 999)
            return rankA - rankB
          })

          // rank 숫자를 문자열로 변환 (Supabase에서 integer로 저장된 경우)
          const numberToRank: Record<number, NewsItem['rank']> = {
            1: '한입',
            2: '두입',
            3: '세입',
            4: '네입',
            5: '다섯입',
            6: '여섯입',
            7: '일곱입',
          }

          // NewsItem 형식으로 변환
          const formattedNews: NewsItem[] = sortedData.map((item: any) => {
            // rank가 숫자인 경우 문자열로 변환, 이미 문자열이면 그대로 사용
            const rankValue = typeof item.rank === 'number' 
              ? (numberToRank[item.rank] || '한입')
              : (item.rank as NewsItem['rank'])
            
            return {
              id: item.id,
              rank: rankValue,
              title: item.title,
              fact: item.fact,
              reason: item.reason,
              impact: item.impact,
            }
          })

          console.log('포맷된 뉴스 개수:', formattedNews.length)
          setNewsItems(formattedNews)

          // 가장 최신 뉴스의 created_at 시간 설정
          const latestDate = new Date(data[0].created_at)
          setLatestUpdateTime(latestDate)
        } else {
          console.log('데이터가 없습니다. 더미 데이터를 표시합니다.')
          // 개발 환경에서 데이터가 없을 때 더미 데이터 표시
          setNewsItems(dummyNews)
          setLatestUpdateTime(new Date())
        }
      } catch (error) {
        console.error('뉴스 데이터 가져오기 중 오류:', error)
        if (error instanceof Error) {
          console.error('에러 메시지:', error.message)
          console.error('에러 스택:', error.stack)
        }
        // 에러 발생 시에도 더미 데이터 표시
        console.log('에러 발생으로 더미 데이터를 표시합니다.')
        setNewsItems(dummyNews)
        setLatestUpdateTime(new Date())
      } finally {
        setLoading(false)
      }
    }

    fetchNews()
  }, [])

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col max-w-lg mx-auto">
      <HeaderWithProgress 
        scrollRef={scrollContainerRef} 
        updateTime={latestUpdateTime}
      />

      <main
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6"
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-400">뉴스를 불러오는 중...</p>
            <p className="text-xs text-gray-500 mt-2">브라우저 콘솔을 확인하세요</p>
          </div>
        ) : newsItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-400">뉴스가 없습니다.</p>
            <p className="text-xs text-gray-500 mt-2">
              Supabase의 news 테이블에 데이터가 있는지 확인하거나<br />
              /api/cron 엔드포인트를 실행하여 뉴스를 수집하세요
            </p>
          </div>
        ) : (
          <ul className="space-y-4 list-none p-0 m-0">
            {newsItems.map((item) => (
              <li key={item.id}>
                <NewsCard item={item} />
              </li>
            ))}
          </ul>
        )}
     
       <DoneSection />
        <BottomSection />
        <FloatingShareButton />
      </main>

      
    </div>
  )
}
