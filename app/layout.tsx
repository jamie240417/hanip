import type { Metadata } from 'next'
import { Noto_Sans_KR } from 'next/font/google'
import './globals.css'

const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  variable: '--font-noto-sans-kr',
  display: 'swap',
})

export const metadata: Metadata = {
  title: '한입 주식 뉴스',
  description: '아침 8시, 수익을 부르는 한 입 뉴스',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className={notoSansKr.variable}>
      <body className="min-h-screen bg-[#0f0f0f] text-white font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
