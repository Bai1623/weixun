import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        obsidian: '#0d0b0a',
        espresso: '#12100f',
        walnut: '#171311',
        gold: '#c8a96a',
        cream: '#f3ebdd',
        muted: '#aaa196',
        wine: '#7a3e2f',
        amber: '#b66c32',
        olive: '#78946c',
      },
      fontFamily: {
        display: ['"Playfair Display"', '"Noto Serif SC"', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 18px 60px rgba(0, 0, 0, 0.32)',
        glow: '0 0 40px rgba(200, 169, 106, 0.08)',
      },
    },
  },
  plugins: [],
} satisfies Config
