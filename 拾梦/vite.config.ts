import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['apple-touch-icon.svg'],
      manifest: {
        name: '拾梦',
        short_name: '拾梦',
        description: '把醒来前的微光，轻轻留在本机。',
        lang: 'zh-CN',
        display: 'standalone',
        theme_color: '#151827',
        background_color: '#eef0f3',
        start_url: './#/home',
        scope: './',
        icons: [
          {
            src: 'icons/app-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        runtimeCaching: [],
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
