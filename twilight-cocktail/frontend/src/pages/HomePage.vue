<template>
  <div class="page-stack">
    <section
      class="home-hero grid min-h-[calc(100vh-9rem)] items-center gap-8 md:grid-cols-[1.02fr_0.98fr]"
    >
      <div class="home-hero__copy">
        <p class="mb-4 text-xs uppercase tracking-[0.28em] text-gold">Twilight Mixbook</p>
        <h1 class="font-display text-5xl leading-tight text-cream md:text-7xl">
          今晚，<br />调一杯属于你的味道。
        </h1>
        <p class="mt-6 max-w-xl text-base leading-8 text-muted md:text-lg">
          从一杯经典开始，认识鸡尾酒的风味、技法与故事。
        </p>
        <div class="mt-8 flex flex-col gap-3 sm:flex-row">
          <RouterLink
            class="ui-button-primary text-center text-sm focus:outline-none focus:ring-2 focus:ring-cream"
            to="/daily"
          >
            开启今日酒单
          </RouterLink>
          <RouterLink
            class="ui-button-secondary text-center text-sm focus:outline-none focus:ring-2 focus:ring-gold"
            to="/cocktails"
          >
            查看经典酒谱
          </RouterLink>
        </div>
      </div>
      <div class="home-hero__visual relative">
        <CocktailVisual
          alt="暮色鸡尾酒主视觉"
          class="home-visual min-h-[34rem]"
          image-url="/cocktails/negroni.jpg"
          tone="amber"
        />
        <div class="ui-panel absolute bottom-4 left-4 right-4 p-4">
          <p class="text-xs text-gold">今日预览</p>
          <h2 class="mt-1 font-display text-2xl">
            {{ daily.selected?.nameZh ?? '今日酒单尚未揭晓' }}
          </h2>
          <p class="mt-2 text-sm leading-6 text-muted">
            {{ daily.selected?.shortDescription ?? '星屑会从完整酒单中，为你筛选一杯。' }}
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
      <div class="motion-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <RouterLink
          v-for="entry in entries"
          :key="entry.to"
          class="ui-card ui-card-interactive p-5 focus:outline-none focus:ring-2 focus:ring-gold"
          :to="entry.to"
        >
          <p class="font-display text-xl text-cream">{{ entry.title }}</p>
          <p class="mt-2 text-sm leading-6 text-muted">{{ entry.description }}</p>
        </RouterLink>
      </div>
    </section>

    <section class="ui-panel p-6">
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

<style scoped>
.home-hero {
  position: relative;
}

.home-hero::before {
  position: absolute;
  left: -6vw;
  top: 8%;
  width: min(28rem, 48vw);
  height: min(28rem, 48vw);
  border-radius: 999px;
  background: rgba(215, 187, 117, 0.08);
  filter: blur(58px);
  content: '';
}

.home-hero__copy,
.home-hero__visual {
  position: relative;
}

.home-visual {
  border-radius: 1rem;
  box-shadow:
    0 2rem 7rem rgba(0, 0, 0, 0.32),
    0 0 0 1px rgba(255, 248, 232, 0.04);
  transform: perspective(1200px) rotateY(-2deg);
}

@media (max-width: 768px) {
  .home-visual {
    min-height: 28rem;
    transform: none;
  }
}
</style>
