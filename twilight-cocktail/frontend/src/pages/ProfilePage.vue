<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <SectionHeading
      eyebrow="Profile"
      title="我的"
      description="当前版本使用匿名本地身份保存收藏、酒柜和课程进度。"
    />
    <div class="rounded-lg border border-gold/15 bg-walnut/70 p-5">
      <p class="text-xs text-muted">匿名用户</p>
      <p class="mt-2 break-all font-mono text-sm text-cream">{{ user.anonymousKey }}</p>
    </div>
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-lg border border-gold/15 bg-walnut/70 p-5">
        <p class="text-muted">收藏</p>
        <p class="mt-2 font-display text-3xl">{{ favorites.slugs.length }}</p>
      </div>
      <div class="rounded-lg border border-gold/15 bg-walnut/70 p-5">
        <p class="text-muted">酒柜材料</p>
        <p class="mt-2 font-display text-3xl">{{ pantry.ingredientSlugs.length }}</p>
      </div>
      <div class="rounded-lg border border-gold/15 bg-walnut/70 p-5">
        <p class="text-muted">课程</p>
        <p class="mt-2 font-display text-3xl">{{ academy.completedCount }}/8</p>
      </div>
      <RouterLink
        class="rounded-lg border border-gold/25 bg-gold/10 p-5 transition hover:border-gold/50 hover:bg-gold/15"
        to="/works"
      >
        <p class="text-muted">我的作品</p>
        <p class="mt-2 font-display text-3xl">{{ works.totalCount }}</p>
      </RouterLink>
    </div>
    <button
      class="rounded-md border border-wine px-5 py-3 text-sm text-cream"
      type="button"
      @click="clearLocal"
    >
      清除本地数据
    </button>
    <p class="text-sm leading-6 text-muted">
      数据来源说明：首轮原型使用本地审核 Mock 数据，后续阶段会接入结构化数据库、来源字段和校对时间。
    </p>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'

import SectionHeading from '@/components/common/SectionHeading.vue'
import { useAcademyStore } from '@/stores/academy'
import { useFavoriteStore } from '@/stores/favorites'
import { usePantryStore } from '@/stores/pantry'
import { useUserStore } from '@/stores/user'
import { useWorkStore } from '@/stores/works'

const user = useUserStore()
const favorites = useFavoriteStore()
const pantry = usePantryStore()
const academy = useAcademyStore()
const works = useWorkStore()

const clearLocal = () => {
  localStorage.clear()
  window.location.reload()
}
</script>
