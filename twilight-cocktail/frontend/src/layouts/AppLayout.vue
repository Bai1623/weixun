<template>
  <div class="app-shell min-h-screen pb-20 text-cream md:pb-0">
    <div class="app-ambient" aria-hidden="true" />

    <header class="app-header sticky top-0 z-40">
      <nav class="app-nav flex w-full items-center justify-between px-5 py-4 md:px-8 xl:px-10">
        <RouterLink class="brand-mark focus:outline-none focus:ring-2 focus:ring-gold" to="/home">
          <span class="brand-mark__glyph" aria-hidden="true" />
          <span>暮调</span>
          <span class="brand-mark__sub">Twilight Mixbook</span>
        </RouterLink>
        <div class="hidden items-center gap-2 md:flex">
          <RouterLink v-for="item in navItems" :key="item.to" v-slot="{ isActive }" :to="item.to">
            <span class="nav-link" :class="{ 'nav-link--active': isActive }">
              {{ item.label }}
            </span>
          </RouterLink>
        </div>
      </nav>
    </header>

    <main class="app-main w-full px-5 py-8 md:px-8 md:py-10 xl:px-10">
      <RouterView v-slot="{ Component, route }">
        <Transition name="router-page" mode="out-in">
          <div :key="route.fullPath" class="page-transition-frame">
            <Suspense>
              <component :is="Component" />
              <template #fallback>
                <div class="route-loading" aria-label="页面加载中">
                  <span />
                  <span />
                  <span />
                </div>
              </template>
            </Suspense>
          </div>
        </Transition>
      </RouterView>
    </main>

    <nav class="mobile-nav fixed inset-x-0 bottom-0 z-40 px-3 py-2 md:hidden">
      <div class="grid grid-cols-5 gap-1">
        <RouterLink v-for="item in mobileItems" :key="item.to" v-slot="{ isActive }" :to="item.to">
          <span class="mobile-nav-link" :class="{ 'mobile-nav-link--active': isActive }">
            {{ item.label }}
          </span>
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
