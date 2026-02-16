# 한입 주식 뉴스

Next.js(App Router) + Tailwind CSS + Lucide React로 구현한 모바일 UI입니다.

## 실행 방법

```bash
cd hanip-stock-news
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 으로 접속하세요.

## 구성

- **다크 모드**: 배경 `#0f0f0f`, 포인트 컬러 `#FF6B35`
- **상단**: 제목 + 업데이트 시간 + 스크롤 프로그래스 바
- **카드**: `NewsCard` 컴포넌트, 한입/두입 등 뱃지 + ① 무슨 일? / ② 왜? / ③ 영향은?
- **하단**: 완독 메시지, 카카오톡 공유 버튼, 이메일 구독 폼
- **플로팅 버튼**: 우측 하단 고정 공유 버튼 (Share2 아이콘)

데이터는 `lib/dummy-news.ts`의 더미 데이터를 사용합니다.
"# hanip" 
"# hanip" 
# hanip
