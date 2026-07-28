<template>
  <div class="space-y-12">
    <section class="grid min-h-[calc(100vh-9rem)] items-center gap-8 md:grid-cols-[1.05fr_0.95fr]">
      <div>
        <p class="mb-4 text-xs uppercase tracking-[0.28em] text-gold">Twilight Cocktail</p>
        <h1 class="font-display text-5xl leading-tight text-cream md:text-7xl">
          今晚，<br />调一杯属于你的味道。
        </h1>
        <p class="mt-6 max-w-xl text-base leading-8 text-muted md:text-lg">
          从一杯经典开始，认识鸡尾酒的风味、技法与故事。
        </p>
        <div class="mt-8 flex flex-col gap-3 sm:flex-row">
          <RouterLink
            class="rounded-md bg-gold px-5 py-3 text-center text-sm font-semibold text-obsidian transition hover:bg-gold/90 focus:outline-none focus:ring-2 focus:ring-cream"
            to="/daily"
          >
            开启今日酒单
          </RouterLink>
          <RouterLink
            class="rounded-md border border-gold/30 px-5 py-3 text-center text-sm font-semibold text-gold transition hover:bg-gold/10 focus:outline-none focus:ring-2 focus:ring-gold"
            to="/cocktails"
          >
            查看经典酒谱
          </RouterLink>
        </div>
      </div>
      <div class="relative">
        <CocktailVisual alt="暮色鸡尾酒主视觉" class="min-h-[34rem]" tone="amber" />
        <div
          class="absolute bottom-4 left-4 right-4 rounded-lg border border-gold/20 bg-obsidian/72 p-4 backdrop-blur-lg"
        >
          <p class="text-xs text-gold">今日预览</p>
          <h2 class="mt-1 font-display text-2xl">
            {{ daily.selected?.nameZh ?? '今日酒单尚未揭晓' }}
          </h2>
          <p class="mt-2 text-sm leading-6 text-muted">
            {{ daily.selected?.shortDescription ?? '轮盘会从热门经典酒款中，为你选择一杯。' }}
          </p>
        </div>
      </div>
    </section>

    <section>
      <SectionHeading
        eyebrow="Quick Start"
        title="今晚可以从这里开始"
        description="保留低门槛入口，让初学者不用先理解所有术语。"
      />
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <RouterLink
          v-for="entry in entries"
          :key="entry.to"
          class="rounded-lg border border-gold/15 bg-walnut/70 p-5 transition hover:border-gold/40 hover:bg-walnut focus:outline-none focus:ring-2 focus:ring-gold"
          :to="entry.to"
        >
          <p class="font-display text-xl text-cream">{{ entry.title }}</p>
          <p class="mt-2 text-sm leading-6 text-muted">{{ entry.description }}</p>
        </RouterLink>
      </div>
    </section>

    <section class="rounded-lg border border-gold/15 bg-walnut/70 p-6">
      <p class="text-xs uppercase tracking-[0.22em] text-gold">
        调酒入门 · {{ academy.completedCount }}/8
      </p>
      <h2 class="mt-3 font-display text-2xl">下一课：摇和与搅拌的区别</h2>
      <p class="mt-2 text-sm leading-6 text-muted">
        本应用仅用于鸡尾酒知识学习与配方记录。请遵守所在地法律法规，未达到法定饮酒年龄请勿饮酒，饮酒后请勿驾驶。
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'

import CocktailVisual from '@/components/common/CocktailVisual.vue'
import SectionHeading from '@/components/common/SectionHeading.vue'
import { useAcademyStore } from '@/stores/academy'
import { useDailyPickStore } from '@/stores/daily'
import { useUserStore } from '@/stores/user'

const daily = useDailyPickStore()
const user = useUserStore()
const academy = useAcademyStore()

const entries = [
  { title: '我有什么酒', description: '从家中材料反推今晚能做什么。', to: '/pantry' },
  { title: '从零开始学习', description: '按八节入门课建立基本概念。', to: '/academy' },
  { title: '发现经典', description: '浏览热门和 IBA 经典酒款。', to: '/cocktails' },
  {
    title: '无酒精特调',
    description: '筛选更轻松的饮用选择。',
    to: '/cocktails?isAlcoholic=false',
  },
]

onMounted(() => {
  user.ensureAnonymousKey()
})
</script>
