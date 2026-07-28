<template>
  <div v-if="cocktail" class="grid gap-8 md:grid-cols-[0.9fr_1.1fr]">
    <CocktailVisual
      :alt="cocktail.nameZh"
      :image-url="cocktail.imageUrl"
      :tone="cocktail.imageTone"
    />
    <div>
      <p class="text-xs uppercase tracking-[0.22em] text-gold">今日酒单</p>
      <h1 class="mt-3 font-display text-5xl">{{ cocktail.nameZh }}</h1>
      <p class="mt-1 text-sm uppercase text-muted">{{ cocktail.nameEn }}</p>
      <p class="mt-5 text-base leading-8 text-muted">{{ cocktail.shortDescription }}</p>
      <div class="mt-6 grid grid-cols-3 gap-3 text-center text-sm">
        <div class="rounded-lg border border-gold/15 p-3">
          <p class="text-muted">难度</p>
          <p class="mt-1 text-cream">{{ cocktail.difficulty }}</p>
        </div>
        <div class="rounded-lg border border-gold/15 p-3">
          <p class="text-muted">时间</p>
          <p class="mt-1 text-cream">{{ cocktail.prepMinutes }} 分钟</p>
        </div>
        <div class="rounded-lg border border-gold/15 p-3">
          <p class="text-muted">强度</p>
          <p class="mt-1 text-cream">{{ cocktail.alcoholLevel }}</p>
        </div>
      </div>
      <p class="mt-6 rounded-lg bg-gold/10 p-4 text-sm leading-6 text-cream">
        推荐理由：{{ daily.reason || '经典热门酒款，制作步骤少，适合作为今日练习。' }}
      </p>
      <div class="mt-6 flex flex-col gap-3 sm:flex-row">
        <RouterLink
          class="rounded-md bg-gold px-5 py-3 text-center font-semibold text-obsidian"
          :to="`/cocktails/${cocktail.slug}`"
        >
          查看配方
        </RouterLink>
        <RouterLink
          class="rounded-md border border-gold/30 px-5 py-3 text-center text-gold"
          :to="`/cocktails/${cocktail.slug}/make`"
        >
          开始制作
        </RouterLink>
      </div>
    </div>
  </div>
  <StateBlock
    v-else
    title="今日酒单尚未揭晓"
    message="先前往每日轮盘，为今晚选择一杯。"
    action-label="去轮盘"
    @action="router.push('/daily')"
  />
</template>

<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router'

import CocktailVisual from '@/components/common/CocktailVisual.vue'
import StateBlock from '@/components/common/StateBlock.vue'
import { useDailyPickStore } from '@/stores/daily'

const router = useRouter()
const daily = useDailyPickStore()
const cocktail = daily.selected
</script>
