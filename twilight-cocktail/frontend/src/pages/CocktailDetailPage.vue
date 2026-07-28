<template>
  <div v-if="cocktail" class="space-y-10">
    <section class="grid gap-8 md:grid-cols-[0.9fr_1.1fr]">
      <CocktailVisual :alt="cocktail.nameZh" :tone="cocktail.imageTone" />
      <div>
        <p class="text-xs uppercase tracking-[0.22em] text-gold">
          {{ cocktail.baseSpirit }} · {{ cocktail.method }}
        </p>
        <h1 class="mt-3 font-display text-5xl">{{ cocktail.nameZh }}</h1>
        <p class="mt-1 text-sm uppercase text-muted">{{ cocktail.nameEn }}</p>
        <p class="mt-5 text-base leading-8 text-muted">{{ cocktail.story }}</p>
        <div class="mt-6 flex flex-col gap-3 sm:flex-row">
          <RouterLink
            class="rounded-md bg-gold px-5 py-3 text-center font-semibold text-obsidian"
            :to="`/cocktails/${cocktail.slug}/make`"
          >
            开始制作
          </RouterLink>
          <button
            class="rounded-md border border-gold/30 px-5 py-3 text-gold"
            type="button"
            @click="favorites.toggle(cocktail.slug)"
          >
            {{ favorites.has(cocktail.slug) ? '取消收藏' : '收藏酒款' }}
          </button>
        </div>
      </div>
    </section>

    <section class="grid gap-4 md:grid-cols-6">
      <div
        v-for="item in stats"
        :key="item.label"
        class="rounded-lg border border-gold/15 bg-walnut/70 p-4"
      >
        <p class="text-xs text-muted">{{ item.label }}</p>
        <p class="mt-1 text-sm text-cream">{{ item.value }}</p>
      </div>
    </section>

    <section class="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <div>
        <SectionHeading title="风味结构" description="五维风味值范围为 0 至 5。" />
        <FlavorRadar :flavors="cocktail.flavors" />
      </div>
      <div>
        <SectionHeading title="配料" description="按制作顺序展示，装饰材料不会阻塞酒柜匹配。" />
        <div class="space-y-3">
          <div
            v-for="item in cocktail.ingredients"
            :key="`${item.slug}-${item.displayOrder}`"
            class="flex items-center justify-between gap-4 rounded-lg border border-gold/15 bg-walnut/70 p-4"
          >
            <div>
              <p class="text-cream">{{ item.nameZh }}</p>
              <p class="text-xs text-muted">{{ item.nameEn }} · {{ item.requirement }}</p>
            </div>
            <p class="text-sm text-gold">{{ item.amount }}</p>
          </div>
        </div>
      </div>
    </section>

    <section>
      <SectionHeading title="制作步骤" description="进入制作模式后会一屏展示一步。" />
      <ol class="grid gap-3 md:grid-cols-3">
        <li
          v-for="step in cocktail.steps"
          :key="step.stepNumber"
          class="rounded-lg border border-gold/15 bg-walnut/70 p-4"
        >
          <p class="text-xs text-gold">步骤 {{ step.stepNumber }} · {{ step.technique }}</p>
          <p class="mt-2 text-sm leading-6 text-cream">{{ step.instruction }}</p>
          <p v-if="step.tip" class="mt-2 text-xs leading-5 text-muted">{{ step.tip }}</p>
        </li>
      </ol>
    </section>

    <section
      class="rounded-lg border border-gold/15 bg-obsidian/50 p-5 text-sm leading-6 text-muted"
    >
      数据来源：{{ cocktail.sourceName }}。本应用仅用于鸡尾酒知识学习与配方记录，请理性饮酒。
    </section>
  </div>
  <StateBlock
    v-else
    title="没有找到这款酒"
    message="返回酒谱列表，重新选择一款经典酒。"
    action-label="返回酒谱"
    @action="router.push('/cocktails')"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import CocktailVisual from '@/components/common/CocktailVisual.vue'
import StateBlock from '@/components/common/StateBlock.vue'
import SectionHeading from '@/components/common/SectionHeading.vue'
import FlavorRadar from '@/components/cocktail/FlavorRadar.vue'
import { useCocktailStore } from '@/stores/cocktails'
import { useFavoriteStore } from '@/stores/favorites'

const route = useRoute()
const router = useRouter()
const store = useCocktailStore()
const favorites = useFavoriteStore()
const cocktail = computed(() => store.bySlug(String(route.params.slug))).value
const stats = computed(() =>
  cocktail
    ? [
        { label: '难度', value: cocktail.difficulty },
        { label: '时间', value: `${cocktail.prepMinutes} 分钟` },
        { label: '调制', value: cocktail.method },
        { label: '杯型', value: cocktail.glassType },
        { label: '强度', value: cocktail.alcoholLevel },
        { label: '材料', value: `${cocktail.ingredients.length} 种` },
      ]
    : [],
)
</script>
