import { NextRequest, NextResponse } from 'next/server'
import Parser from 'rss-parser'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabase } from '@/lib/supabase'

const parser = new Parser()
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// 한국 시간(KST) 정보 가져오기
function getKSTInfo(): { date: Date; hour: number; minute: number; dayOfWeek: number } {
  const now = new Date()
  
  // Intl.DateTimeFormat을 사용해 한국 시간의 각 부분 추출
  const kstFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hour12: false,
  })
  
  const parts = kstFormatter.formatToParts(now)
  const year = parseInt(parts.find(p => p.type === 'year')!.value)
  const month = parseInt(parts.find(p => p.type === 'month')!.value) - 1
  const day = parseInt(parts.find(p => p.type === 'day')!.value)
  const hour = parseInt(parts.find(p => p.type === 'hour')!.value)
  const minute = parseInt(parts.find(p => p.type === 'minute')!.value)
  const second = parseInt(parts.find(p => p.type === 'second')!.value)
  
  // 한국 시간으로 Date 객체 생성 (로컬 시간으로 해석되지만 값은 KST 기준)
  const kstDate = new Date(year, month, day, hour, minute, second)
  
  // 요일 계산 (0: 일요일, 1: 월요일, ..., 6: 토요일)
  const weekdayStr = parts.find(p => p.type === 'weekday')!.value
  const weekdayMap: Record<string, number> = {
    'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
  }
  const dayOfWeek = weekdayMap[weekdayStr] ?? kstDate.getDay()
  
  return {
    date: kstDate,
    hour,
    minute,
    dayOfWeek,
  }
}

// 실행 가능 여부 체크
async function shouldRun(): Promise<boolean> {
  const kstInfo = getKSTInfo()
  const { hour, minute, dayOfWeek } = kstInfo
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5 // 월~금
  
  // 테스트 모드: 오전 3시 20분 ~ 5시까지 30분 단위로 실행
  // 실행 시점: 3:20, 3:50, 4:20, 4:50, 5:00
  const isTestTimeWindow = (hour === 3 && minute >= 20) || (hour === 4) || (hour === 5 && minute === 0)
  
  if (isTestTimeWindow) {
    // 테스트 시간대: 30분 단위로 실행
    const lastRun = await getLastRunTime()
    
    if (!lastRun) {
      console.log(`[테스트 모드] ${hour}시 ${minute}분 - 첫 실행: 실행합니다.`)
      return true
    }
    
    const lastRunTime = new Date(lastRun)
    const now = new Date()
    const minutesSinceLastRun = (now.getTime() - lastRunTime.getTime()) / (1000 * 60)
    
    // 30분 이상 경과했으면 실행
    if (minutesSinceLastRun >= 30) {
      console.log(`[테스트 모드] ${hour}시 ${minute}분 - 마지막 실행으로부터 ${minutesSinceLastRun.toFixed(1)}분 경과: 실행합니다.`)
      return true
    } else {
      console.log(`[테스트 모드] ${hour}시 ${minute}분 - 마지막 실행으로부터 ${minutesSinceLastRun.toFixed(1)}분 경과 (30분 미만): 스킵합니다.`)
      return false
    }
  }
  
  // 테스트 시간대가 아니면 기존 로직 실행
  // 평일 8시~19시: 매시간 실행
  if (isWeekday && hour >= 8 && hour <= 19) {
    console.log(`평일 업무시간 (${hour}시): 실행합니다.`)
    return true
  }
  
  // 그 외 시간: 4시간마다 실행
  // 마지막 실행 시간을 Supabase에서 가져오기
  try {
    const { data, error } = await supabase
      .from('cron_logs')
      .select('last_run_at')
      .order('last_run_at', { ascending: false })
      .limit(1)
      .maybeSingle() // single() 대신 maybeSingle() 사용하여 테이블이 없어도 에러 발생 안 함
    
    // cron_logs 테이블이 없거나 데이터가 없으면 실행 허용
    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        // 테이블이 없거나 데이터가 없으면 첫 실행으로 간주
        console.log('cron_logs 테이블이 없거나 데이터 없음: 실행합니다.')
        return true
      }
      console.error('마지막 실행 시간 조회 실패:', error)
      // 다른 에러 발생 시에도 실행 허용 (안전장치)
      return true
    }
    
    if (!data || !data.last_run_at) {
      // 첫 실행이거나 기록이 없으면 실행
      console.log('첫 실행 또는 기록 없음: 실행합니다.')
      return true
    }
    
    const lastRunAt = new Date(data.last_run_at)
    const now = new Date()
    const hoursSinceLastRun = (now.getTime() - lastRunAt.getTime()) / (1000 * 60 * 60)
    
    console.log(`마지막 실행으로부터 ${hoursSinceLastRun.toFixed(1)}시간 경과`)
    
    // 4시간 이상 지났으면 실행
    if (hoursSinceLastRun >= 4) {
      console.log('4시간 이상 경과: 실행합니다.')
      return true
    } else {
      console.log('4시간 미경과: 스킵합니다.')
      return false
    }
  } catch (error) {
    console.error('실행 여부 체크 중 오류:', error)
    // 에러 발생 시 실행 허용 (안전장치)
    return true
  }
}

// 마지막 실행 시간 가져오기 (헬퍼 함수)
async function getLastRunTime(): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('cron_logs')
      .select('last_run_at')
      .order('last_run_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return null
      }
      return null
    }
    
    return data?.last_run_at || null
  } catch (error) {
    return null
  }
}

// 실행 시간 기록
async function logRunTime(): Promise<void> {
  try {
    const { error } = await supabase
      .from('cron_logs')
      .insert({
        last_run_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
    
    if (error) {
      console.error('실행 시간 기록 실패:', error)
      // cron_logs 테이블이 없어도 계속 진행
    }
  } catch (error) {
    console.error('실행 시간 기록 중 예외 발생:', error)
    // 기록 실패해도 계속 진행
  }
}

// 구글 뉴스 RSS URL 목록 (금융, 비즈니스)
const RSS_FEEDS = [
  'https://news.google.com/rss/topics/CAAqIQgKIhtDQkFTRGdvSUwyMHZNREpmTjNRU0FtdHZLQUFQAQ?hl=ko&gl=KR&ceid=KR:ko', // 금융
  'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtdHZHZ0pMVWlnQVAB?hl=ko&gl=KR&ceid=KR:ko', // 비즈니스
]

// 제외 키워드 (인물명 등 노이즈)
const EXCLUDE_KEYWORDS = ['이부진', '외계인']

// 포함 키워드 (주식, 경제, 비즈니스 관련)
const INCLUDE_KEYWORDS = [
  '주식', '주가', '증시', '코스피', '코스닥', '증권', '투자', '매수', '매도',
  '경제', '금융', '은행', '금리', '환율', '물가', '인플레이션', 'GDP',
  '비즈니스', '기업', '회사', '실적', '매출', '영업이익', '배당',
  'M&A', '인수', '합병', '공시', '상장', 'IPO', '어닝',
  '삼성전자', 'SK하이닉스', '하이닉스', '반도체', 'AI', '엔비디아',
  '비트코인', '암호화폐', 'ETF', '펀드', '채권', '시장',
  'FOMC', '파월', '연준', '규제', '정책', '투자 유치', '계약 체결'
]

// 시장 충격 키워드 (+20점)
const MARKET_IMPACT_KEYWORDS = [
  '금리', '어닝 서프라이즈', '어닝서프라이즈', '폭등', '폭락', 
  'FOMC', '파월', '실적 발표', '상한가'
]

// 주요 이슈 키워드 (+10점)
const MAJOR_ISSUE_KEYWORDS = [
  'M&A', '인수', '투자 유치', '계약 체결', '규제 해제'
]

interface NewsArticle {
  title: string
  link: string
  pubDate: string
  contentSnippet?: string
  content?: string
}

interface ScoredArticle extends NewsArticle {
  score: number
  baseScore: number // 기본 점수 (RSS 피드 역순)
  marketImpactScore: number // 시장 충격 가중치
  majorIssueScore: number // 주요 이슈 가중치
  clusterScore: number // 중복 언급 점수
}

// RSS 피드에서 뉴스 수집 (최대 50개, 필터링 후 7개로 제한)
async function fetchNewsFromRSS(): Promise<NewsArticle[]> {
  const allArticles: NewsArticle[] = []

  for (const feedUrl of RSS_FEEDS) {
    try {
      const feed = await parser.parseURL(feedUrl)
      
      if (feed.items) {
        const articles = feed.items
          .filter(item => item.title && item.link)
          .map(item => ({
            title: item.title || '',
            link: item.link || '',
            pubDate: item.pubDate || new Date().toISOString(),
            contentSnippet: item.contentSnippet,
            content: item.content,
          }))
        
        allArticles.push(...articles)
      }
    } catch (error) {
      console.error(`RSS 피드 수집 실패 (${feedUrl}):`, error)
    }
  }

  // 최대 50개로 제한 (필터링 전)
  return allArticles.slice(0, 50)
}

// 필터링: 제외 키워드 및 포함 키워드 체크
function filterArticles(articles: NewsArticle[]): NewsArticle[] {
  const filtered = articles.filter(article => {
    const title = article.title.toLowerCase()
    const content = (article.contentSnippet || article.content || '').toLowerCase()
    const text = `${title} ${content}`

    // 제외 키워드 체크 (단, 호텔신라와 함께 나오면 허용)
    const excludeKeywordsFound: string[] = []
    EXCLUDE_KEYWORDS.forEach(keyword => {
      if (text.includes(keyword.toLowerCase())) {
        excludeKeywordsFound.push(keyword)
      }
    })
    
    const hasHotelShilla = text.includes('호텔신라')
    
    // 외계인 키워드가 있으면 무조건 제외 (호텔신라 예외 없음)
    if (excludeKeywordsFound.includes('외계인')) {
      console.log(`[필터링] 외계인 키워드로 제외: ${article.title.substring(0, 50)}...`)
      return false
    }
    
    // 이부진 키워드는 호텔신라와 함께 있으면 허용
    if (excludeKeywordsFound.includes('이부진') && !hasHotelShilla) {
      console.log(`[필터링] 이부진 키워드로 제외: ${article.title.substring(0, 50)}...`)
      return false
    }

    // 주식, 경제, 비즈니스 관련 키워드 포함 여부 체크
    const hasIncludeKeyword = INCLUDE_KEYWORDS.some(keyword => 
      text.includes(keyword.toLowerCase())
    )

    if (!hasIncludeKeyword) {
      console.log(`[필터링] 주식/경제/비즈니스 키워드 없음으로 제외: ${article.title.substring(0, 50)}...`)
      return false
    }

    return true
  })
  
  console.log(`필터링 결과: ${articles.length}개 → ${filtered.length}개`)
  return filtered
}

// 명사 추출 및 빈도수 계산
function extractNounsFromTitles(articles: NewsArticle[]): Map<string, number> {
  const nounFrequency = new Map<string, number>()
  
  // 주요 명사 키워드 목록 (경제/금융/비즈니스 관련)
  const nounKeywords = [
    '삼성전자', 'SK하이닉스', '하이닉스', '코스피', '코스닥', '금리', '환율', '주가', 
    '실적', '매출', '영업이익', '배당', '인수', '합병', '투자', '계약',
    '규제', '정책', 'FOMC', '파월', '연준', '은행', '증권', '보험',
    '비트코인', '암호화폐', 'ETF', '펀드', '채권', '주식', '시장',
    '경제', '성장', '인플레이션', '물가', '고용', 'GDP', '수출', '수입',
    '반도체', 'AI', '엔비디아', '애플', '구글', '마이크로소프트', '테슬라',
    'M&A', 'IPO', '상장', '공시', '어닝', '서프라이즈', '폭등', '폭락'
  ]
  
  articles.forEach(article => {
    const title = article.title
    
    nounKeywords.forEach(keyword => {
      // 대소문자 구분 없이 포함 여부 확인
      if (title.toLowerCase().includes(keyword.toLowerCase())) {
        nounFrequency.set(keyword, (nounFrequency.get(keyword) || 0) + 1)
      }
    })
  })
  
  return nounFrequency
}

// 랭킹 알고리즘: 점수 계산
function scoreArticles(articles: NewsArticle[]): ScoredArticle[] {
  // 명사 빈도수 계산 (중복 언급 점수용)
  const nounFrequency = extractNounsFromTitles(articles)
  
  return articles.map((article, index) => {
    const title = article.title.toLowerCase()
    const content = (article.contentSnippet || article.content || '').toLowerCase()
    const text = `${title} ${content}`
    
    // 1. 기본 점수: RSS 피드 역순 (최신일수록 높음, 1~50점)
    const baseScore = 50 - index
    
    // 2. 시장 충격 가중치 (+20점)
    let marketImpactScore = 0
    MARKET_IMPACT_KEYWORDS.forEach(keyword => {
      const keywordLower = keyword.toLowerCase()
      if (title.includes(keywordLower) || text.includes(keywordLower)) {
        marketImpactScore += 20
      }
    })
    
    // 3. 주요 이슈 가중치 (+10점)
    let majorIssueScore = 0
    MAJOR_ISSUE_KEYWORDS.forEach(keyword => {
      const keywordLower = keyword.toLowerCase()
      if (title.includes(keywordLower) || text.includes(keywordLower)) {
        majorIssueScore += 10
      }
    })
    
    // 4. 중복 언급(Cluster) 점수: 명사 빈도수 분석
    // 2회 이상 등장하는 단어가 포함된 기사는 등장 횟수당 +5점
    let clusterScore = 0
    nounFrequency.forEach((frequency, noun) => {
      if (frequency >= 2 && (title.includes(noun.toLowerCase()) || text.includes(noun.toLowerCase()))) {
        clusterScore += frequency * 5 // 등장 횟수당 +5점
      }
    })
    
    const totalScore = baseScore + marketImpactScore + majorIssueScore + clusterScore
    
    return {
      ...article,
      score: totalScore,
      baseScore,
      marketImpactScore,
      majorIssueScore,
      clusterScore,
    }
  })
}

// Top 7 선정
function selectTopArticles(scoredArticles: ScoredArticle[], limit: number = 7): ScoredArticle[] {
  return scoredArticles
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

// Gemini로 뉴스 요약
async function summarizeNews(article: ScoredArticle): Promise<{
  title: string
  fact: string
  reason: string
  impact: string
}> {
  const fullPrompt = `당신은 '친절한 투자 선배' 페르소나입니다. 다음 뉴스 기사를 읽고 JSON 형식으로 요약해주세요.

**원문 제목:** ${article.title}
**원문 내용:** ${article.contentSnippet || article.content || ''}

**요약 구조:**
1. **한 줄 헤드라인**: 원문보다 직관적이고 클릭하고 싶게 이모지를 섞어 재작성해주세요.
2. **① 무슨 일?**: 초등학생도 이해할 수 있게 핵심 팩트를 설명해주세요.
3. **② 왜?**: 배경지식이 없는 직장인도 이해하도록 원인과 배경을 설명해주세요.
4. **③ 영향은?**: 이 뉴스가 주가나 향후 시장에 미칠 영향을 투자 포인트로 짚어주세요.

**UX 라이팅 지침:**
- 딱딱한 신문 문체가 아닌 "~했어요", "~입니다" 스타일의 경어체를 사용해주세요.
- 전문 용어가 나오면 괄호를 치고 아주 쉽게 풀어서 써주세요.
- 친절하고 따뜻한 투자 선배처럼 설명해주세요.

**중요:** 반드시 유효한 JSON 형식으로만 응답해주세요. 다른 설명 없이 JSON만 반환해주세요.

다음 형식의 JSON으로 응답해주세요:
{
  "title": "이모지를 포함한 직관적인 헤드라인 (클릭하고 싶게)",
  "fact": "① 무슨 일? - 초등학생도 이해할 수 있는 핵심 팩트",
  "reason": "② 왜? - 배경지식 없는 직장인도 이해하는 원인과 배경",
  "impact": "③ 영향은? - 주가나 향후 시장에 미칠 영향과 투자 포인트"
}`

  try {
    // Gemini API 키 확인
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY가 설정되지 않았습니다.')
      throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.')
    }

    console.log(`요약 시작: ${article.title.substring(0, 50)}...`)
    console.log(`프롬프트 길이: ${fullPrompt.length}자`)

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-pro',
      generationConfig: {
        temperature: 0.8, // 창의적인 이모지와 표현을 위해 약간 높임
        responseMimeType: 'application/json',
      },
      systemInstruction: '당신은 친절한 투자 선배 페르소나입니다. 뉴스를 쉽고 따뜻하게 설명하며, 항상 유효한 JSON만 응답합니다.',
    })

    const result = await model.generateContent(fullPrompt)
    const response = await result.response
    const responseText = response.text()

    console.log('Gemini API 호출 성공')
    console.log(`응답 텍스트 길이: ${responseText.length}자`)
    console.log(`응답 텍스트 샘플: ${responseText.substring(0, 200)}...`)

    if (!responseText || responseText === '{}') {
      throw new Error('Gemini 응답이 비어있습니다.')
    }

    // JSON 파싱 (마크다운 코드 블록 제거)
    let jsonText = responseText.trim()
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    const summary = JSON.parse(jsonText)
    console.log('JSON 파싱 성공:', Object.keys(summary))

    if (!summary.title || !summary.fact || !summary.reason || !summary.impact) {
      console.warn('요약 필드가 불완전합니다:', {
        hasTitle: !!summary.title,
        hasFact: !!summary.fact,
        hasReason: !!summary.reason,
        hasImpact: !!summary.impact,
      })
    }

    return {
      title: summary.title || article.title,
      fact: summary.fact || '',
      reason: summary.reason || '',
      impact: summary.impact || '',
    }
  } catch (error) {
    console.error('Gemini 요약 실패:', error)
    
    // 에러 상세 정보 출력
    if (error instanceof Error) {
      console.error('에러 메시지:', error.message)
      console.error('에러 스택:', error.stack)
    }
    
    // Gemini API 에러인 경우 상세 정보 출력
    if (error && typeof error === 'object' && 'status' in error) {
      console.error('Gemini API 에러 상태:', error.status)
      console.error('Gemini API 에러 상세:', JSON.stringify(error, null, 2))
    }
    
    // 실패 시 기본값 반환
    return {
      title: article.title,
      fact: article.contentSnippet || '요약 실패',
      reason: '요약 실패',
      impact: '요약 실패',
    }
  }
}

// Supabase에 저장
async function saveToDatabase(
  summaries: Array<{
    title: string
    fact: string
    reason: string
    impact: string
  }>,
  articles: ScoredArticle[]
) {
  try {
    // 기존 데이터 삭제 (선택적 - 필요시 주석 해제)
    // await supabase.from('news').delete().neq('id', '0')

    // 새 데이터 삽입
    const biteLabels: Array<'한입' | '두입' | '세입' | '네입' | '다섯입' | '여섯입' | '일곱입'> = 
      ['한입', '두입', '세입', '네입', '다섯입', '여섯입', '일곱입']

    // rank를 숫자로 매핑 (Supabase에서 integer 타입인 경우)
    const rankToNumber: Record<string, number> = {
      '한입': 1,
      '두입': 2,
      '세입': 3,
      '네입': 4,
      '다섯입': 5,
      '여섯입': 6,
      '일곱입': 7,
    }

    const newsItems = summaries.map((summary, index) => {
      const rankLabel = biteLabels[index] || '한입'
      const article = articles[index]
      // 1위 뉴스는 rank=1로 확실히 부여 (is_top 플래그 대신 rank 값으로 구분)
      const rank = index === 0 ? 1 : (rankToNumber[rankLabel] || index + 1)
      
      return {
        rank: rank, // 1위는 rank=1로 확실히 부여
        title: summary.title,
        fact: summary.fact, // ① 무슨 일?
        reason: summary.reason, // ② 왜?
        impact: summary.impact, // ③ 영향은?
        url: article?.link || '', // 원본 기사 링크 추가
        category: '경제', // 기본 카테고리 (필요시 동적으로 설정 가능)
        created_at: new Date().toISOString(),
      }
    })
    
    console.log('저장할 데이터 샘플:', JSON.stringify(newsItems[0], null, 2))

    const { error } = await supabase.from('news').insert(newsItems)

    if (error) {
      console.error('Supabase 저장 실패:', error)
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error('데이터베이스 저장 중 오류:', error)
    throw error
  }
}

export async function GET(request: NextRequest) {
  try {
    // 인증 체크 (선택적 - cron job 보안을 위해)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 한국 시간 기준 실행 여부 체크
    const kstInfo = getKSTInfo()
    const now = new Date()
    const kstTimeString = now.toLocaleString('ko-KR', { 
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short'
    })
    
    console.log(`[${kstTimeString} KST] Cron 실행 체크 중...`)
    
    const shouldExecute = await shouldRun()
    
    if (!shouldExecute) {
      console.log('실행 조건 미충족: 스킵합니다.')
      return NextResponse.json({
        success: true,
        message: '실행 조건 미충족으로 스킵되었습니다.',
        skipped: true,
        kstTime: kstTimeString,
      })
    }

    console.log('뉴스 수집 시작...')

    // 1. RSS에서 뉴스 수집 (최대 50개)
    const allArticles = await fetchNewsFromRSS()
    console.log(`수집된 기사 수: ${allArticles.length}`)

    // 2. 필터링
    const filteredArticles = filterArticles(allArticles)
    console.log(`필터링 후 기사 수: ${filteredArticles.length}`)

    // 3. 점수 계산 및 랭킹
    const scoredArticles = scoreArticles(filteredArticles)
    
    // 점수 상위 기사 로깅
    console.log('점수 상위 10개 기사:')
    scoredArticles
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .forEach((article, idx) => {
        console.log(`${idx + 1}. [${article.score}점] ${article.title}`)
        console.log(`   기본:${article.baseScore} 시장충격:${article.marketImpactScore} 주요이슈:${article.majorIssueScore} 클러스터:${article.clusterScore}`)
      })
    
    const topArticles = selectTopArticles(scoredArticles, 7)
    console.log(`Top 7 선정 완료`)

    // 4. Gemini로 요약 (테스트: 1개만 요약)
    console.log('AI 요약 시작... (테스트: 1개만 요약)')
    const testArticle = topArticles[0]
    if (!testArticle) {
      throw new Error('요약할 뉴스가 없습니다.')
    }
    
    console.log(`요약 대상: ${testArticle.title}`)
    const testSummary = await summarizeNews(testArticle)
    console.log('AI 요약 완료')
    console.log('요약 결과:', JSON.stringify(testSummary, null, 2))
    
    // 테스트를 위해 1개만 배열로 만들어서 저장
    const summaries = [testSummary]
    const articlesForSave = [testArticle]

    // 5. Supabase에 저장
    console.log('데이터베이스 저장 시작...')
    await saveToDatabase(summaries, articlesForSave)
    console.log('데이터베이스 저장 완료')

    // 6. 실행 시간 기록
    await logRunTime()

    return NextResponse.json({
      success: true,
      message: `${summaries.length}개의 뉴스가 수집되고 저장되었습니다.`,
      kstTime: kstTimeString,
      summaries: summaries.map((s, i) => ({
        ...s,
        originalTitle: topArticles[i].title,
      })),
    })
  } catch (error) {
    console.error('Cron 작업 실패:', error)
    const errorMessage = error instanceof Error 
      ? error.message 
      : typeof error === 'object' && error !== null
      ? JSON.stringify(error)
      : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    
    console.error('에러 메시지:', errorMessage)
    console.error('에러 스택:', errorStack)
    
    return NextResponse.json(
      { 
        error: 'Cron 작업 실패', 
        message: errorMessage,
        stack: errorStack
      },
      { status: 500 }
    )
  }
}
