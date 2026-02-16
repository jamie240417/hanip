export type Rank =
  | '한입'
  | '두입'
  | '세입'
  | '네입'
  | '다섯입'
  | '여섯입'
  | '일곱입'

export interface NewsItem {
  id: string
  rank: Rank
  title: string
  fact: string   // ① 무슨 일?
  reason: string   // ② 왜?
  impact: string // ③ 영향은?
}
