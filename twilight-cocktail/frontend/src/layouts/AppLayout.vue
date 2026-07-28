<template>
  <div class="min-h-screen pb-20 text-cream md:pb-0">
    <header class="sticky top-0 z-40 border-b border-gold/10 bg-obsidian/86 backdrop-blur-xl">
      <nav class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
        <RouterLink
          class="font-display text-xl text-cream focus:outline-none focus:ring-2 focus:ring-gold"
          to="/home"
        >
          暮色酒单
        </RouterLink>
        <div class="hidden items-center gap-2 md:flex">
          <RouterLink
            v-for="item in navItems"
            :key="item.to"
            class="rounded-md px-3 py-2 text-sm text-muted transition hover:bg-cream/5 hover:text-cream focus:outline-none focus:ring-2 focus:ring-gold"
            :to="item.to"
          >
            {{ item.label }}
          </RouterLink>
        </div>
      </nav>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <RouterView />
    </main>

    <nav
      class="fixed inset-x-0 bottom-0 z-40 border-t border-gold/10 bg-obsidian/95 px-3 py-2 backdrop-blur-xl md:hidden"
    >
      <div class="grid grid-cols-5 gap-1">
        <RouterLink
          v-for="item in mobileItems"
          :key="item.to"
          class="rounded-md px-2 py-2 text-center text-xs text-muted transition hover:bg-cream/5 hover:text-cream focus:outline-none focus:ring-2 focus:ring-gold"
          :to="item.to"
        >
          {{ item.label }}
        </RouterLink>
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'

const navItems = [
  { label: '首页', to: '/home' },
  { label: '每日酒单', to: '/daily' },
  { label: '酒谱', to: '/cocktails' },
  { label: '调酒学院', to: '/academy' },
  { label: '我的酒柜', to: '/pantry' },
  { label: '我的', to: '/profile' },
]

const mobileItems = [
  { label: '首页', to: '/home' },
  { label: '每日', to: '/daily' },
  { label: '酒谱', to: '/cocktails' },
  { label: '酒柜', to: '/pantry' },
  { label: '我的', to: '/profile' },
]
</script>
