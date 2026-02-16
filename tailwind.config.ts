import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        accent: '#FF6B35',
        'accent/90': 'rgba(255, 107, 53, 0.9)',
        charcoal: '#1a1a1a',
        'card-bg': '#252525',
        'input-bg': '#2d2d2d',
        'footer-bg': '#2a2520',
      },
      fontFamily: {
        sans: ['var(--font-noto-sans-kr)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
