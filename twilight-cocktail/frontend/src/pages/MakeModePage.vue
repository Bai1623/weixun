<template>
  <div v-if="cocktail" class="mx-auto max-w-3xl">
    <div class="mb-6 flex items-center justify-between">
      <RouterLink class="text-sm text-gold" :to="`/cocktails/${cocktail.slug}`"
        >退出制作</RouterLink
      >
      <p class="text-sm text-muted">
        步骤 {{ currentStepIndex + 1 }} / {{ cocktail.steps.length }}
      </p>
    </div>
    <section class="min-h-[55vh] rounded-lg border border-gold/15 bg-walnut/80 p-6 md:p-10">
      <p class="text-xs uppercase tracking-[0.22em] text-gold">{{ cocktail.nameEn }}</p>
      <h1 class="mt-3 font-display text-4xl">{{ cocktail.nameZh }}</h1>
      <p class="mt-8 text-2xl leading-relaxed text-cream">{{ step.instruction }}</p>
      <p v-if="step.tip" class="mt-6 rounded-lg bg-gold/10 p-4 text-sm leading-6 text-muted">
        {{ step.tip }}
      </p>
    </section>
    <div class="mt-6 grid grid-cols-2 gap-3">
      <button
        class="min-h-12 rounded-md border border-gold/30 px-5 py-3 text-gold disabled:opacity-40"
        type="button"
        :disabled="currentStepIndex === 0"
        @click="prev"
      >
        上一步
      </button>
      <button
        class="min-h-12 rounded-md bg-gold px-5 py-3 font-semibold text-obsidian"
        type="button"
        @click="next"
      >
        {{ currentStepIndex === cocktail.steps.length - 1 ? '完成制作' : '完成本步' }}
      </button>
    </div>
  </div>
  <StateBlock v-else title="制作进度不可用" message="请回到酒谱详情重新进入制作模式。" />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import StateBlock from '@/components/common/StateBlock.vue'
import { useCocktailStore } from '@/stores/cocktails'
import type { CocktailStep } from '@/types/cocktail'

const route = useRoute()
const router = useRouter()
const store = useCocktailStore()
const cocktail = computed(() => store.bySlug(String(route.params.slug))).value
const storageKey = `current_make_progress:${cocktail?.slug ?? 'unknown'}`
const saved = Number(window.localStorage.getItem(storageKey) ?? '0')
const maxStepIndex = Math.max(0, (cocktail?.steps.length ?? 1) - 1)
const currentStepIndex = ref(
  Number.isFinite(saved) ? Math.min(Math.max(saved, 0), maxStepIndex) : 0,
)
const fallbackStep: CocktailStep = {
  stepNumber: 1,
  instruction: '请回到酒谱详情重新进入制作模式。',
  technique: '准备',
}
const step = computed(
  () => cocktail?.steps[currentStepIndex.value] ?? cocktail?.steps[0] ?? fallbackStep,
)

watch(currentStepIndex, (value) => {
  window.localStorage.setItem(storageKey, `${value}`)
})

const prev = () => {
  currentStepIndex.value = Math.max(0, currentStepIndex.value - 1)
}

const next = () => {
  if (!cocktail) return
  if (currentStepIndex.value >= cocktail.steps.length - 1) {
    window.localStorage.removeItem(storageKey)
    router.push(`/cocktails/${cocktail.slug}`)
    return
  }
  currentStepIndex.value += 1
}
</script>
