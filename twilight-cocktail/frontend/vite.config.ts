import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

const githubPagesBase = process.env.GITHUB_PAGES === 'true' ? '/weixun-Twilight-Mixbook/' : '/'

export default defineConfig({
  base: githubPagesBase,
  plugins: [
    vue(),
    VitePWA({
      selfDestroying: true,
      registerType: 'autoUpdate',
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
      manifest: {
        name: '暮色酒单',
        short_name: '暮色酒单',
        description: '高雅、低门槛的私人调酒助手',
        theme_color: '#0d0b0a',
        background_color: '#0d0b0a',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/test/setup.ts'],
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/',
      },
    },
  },
})
