<template>
  <div class="page-stack mx-auto max-w-3xl">
    <SectionHeading
      eyebrow="Profile"
      title="我的"
      description="查看个人数据概览，管理云端账号、备份与恢复。"
    />
    <div class="ui-panel p-5">
      <p class="text-xs text-muted">匿名用户</p>
      <p class="mt-2 break-all font-mono text-sm text-cream">{{ user.anonymousKey }}</p>
    </div>
    <div class="motion-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="ui-card p-5">
        <p class="text-muted">收藏</p>
        <p class="mt-2 font-display text-3xl">{{ favorites.slugs.length }}</p>
      </div>
      <div class="ui-card p-5">
        <p class="text-muted">酒柜材料</p>
        <p class="mt-2 font-display text-3xl">{{ pantry.ingredientSlugs.length }}</p>
      </div>
      <div class="ui-card p-5">
        <p class="text-muted">课程</p>
        <p class="mt-2 font-display text-3xl">{{ academy.completedCount }}/8</p>
      </div>
      <RouterLink class="ui-card ui-card-interactive p-5" to="/works">
        <p class="text-muted">我的作品</p>
        <p class="mt-2 font-display text-3xl">{{ works.totalCount }}</p>
      </RouterLink>
    </div>
    <RouterLink
      data-testid="account-data-entry"
      class="ui-panel ui-card-interactive flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
      to="/profile/data"
    >
      <span>
        <span class="block text-xs uppercase tracking-[0.2em] text-gold">Account & Data</span>
        <span class="mt-2 block font-display text-2xl text-cream">账号与数据</span>
        <span class="mt-2 block text-sm leading-6 text-muted">
          登录或切换云端账号，检查备份、备份到云端、从云端恢复及管理本机数据。
        </span>
      </span>
      <span class="shrink-0 text-sm text-gold">进入管理 →</span>
    </RouterLink>
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
</script>
