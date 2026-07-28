<template>
  <div class="mx-auto max-w-4xl">
    <SectionHeading
      eyebrow="Daily Ritual"
      title="今天会是哪一杯？"
      description="从热门经典中，选出一款适合今晚练习的酒。"
    />
    <DailyWheel
      :candidates="wheelCandidates"
      :rotation="rotation"
      :spinning="spinning"
      @spin="spin"
    />
    <Transition name="daily-reveal">
      <div
        v-if="selected"
        class="daily-result mx-auto mt-8 max-w-xl rounded-lg border border-gold/15 bg-walnut/80 p-5 text-center"
      >
        <p class="text-sm text-gold">今日推荐已揭晓</p>
        <h2 class="mt-2 font-display text-3xl">{{ selected.nameZh }}</h2>
        <p class="mt-2 text-sm text-muted">{{ selected.shortDescription }}</p>
        <RouterLink
          class="mt-5 inline-flex rounded-md bg-gold px-5 py-3 text-sm font-semibold text-obsidian"
          to="/daily/result"
        >
          查看今日酒单
        </RouterLink>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import SectionHeading from '@/components/common/SectionHeading.vue'
import DailyWheel from '@/components/daily/DailyWheel.vue'
import { useCocktailStore } from '@/stores/cocktails'
import { useDailyPickStore } from '@/stores/daily'
import { useUserStore } from '@/stores/user'
import type { Cocktail } from '@/types/cocktail'
import { getWheelRotationForIndex } from '@/utils/dailyPick'

const daily = useDailyPickStore()
const user = useUserStore()
const cocktailStore = useCocktailStore()
const spinning = ref(false)
const rotation = ref(0)
const selected = ref<Cocktail | undefined>(daily.selected)
const wheelCandidates = computed(() => cocktailStore.items.slice(0, 12))

const selectedIndex = computed(() =>
  selected.value
    ? wheelCandidates.value.findIndex((item) => item.slug === selected.value?.slug)
    : 0,
)

const spin = async () => {
  if (spinning.value) return
  spinning.value = true
  const userId = await user.ensureRemoteUser()
  const cocktail = await daily.reveal(user.anonymousKey, userId)
  selected.value = cocktail
  const index = Math.max(
    0,
    wheelCandidates.value.findIndex((item) => item.slug === cocktail.slug),
  )
  rotation.value = getWheelRotationForIndex(index, wheelCandidates.value.length, 5)
  window.setTimeout(() => {
    spinning.value = false
  }, 3300)
}

if (selected.value) {
  rotation.value = getWheelRotationForIndex(
    Math.max(0, selectedIndex.value),
    wheelCandidates.value.length,
    1,
  )
}

onMounted(() => {
  void cocktailStore.fetchAll()
})
</script>

<style scoped>
.daily-result {
  position: relative;
  overflow: hidden;
  box-shadow:
    0 1.3rem 3.4rem rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(243, 235, 221, 0.08);
}

.daily-result::before {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    115deg,
    transparent 0 38%,
    rgba(243, 235, 221, 0.14) 46%,
    transparent 54%
  );
  content: '';
  transform: translateX(-120%);
}

.daily-reveal-enter-active {
  transition:
    opacity 620ms ease,
    transform 720ms cubic-bezier(0.16, 1, 0.3, 1),
    filter 720ms ease;
}

.daily-reveal-enter-active .daily-result::before {
  animation: reveal-sheen 920ms 140ms cubic-bezier(0.22, 1, 0.36, 1);
}

.daily-reveal-enter-from {
  opacity: 0;
  filter: blur(10px);
  transform: translateY(1.2rem) scale(0.98);
}

@keyframes reveal-sheen {
  from {
    transform: translateX(-120%);
  }
  to {
    transform: translateX(120%);
  }
}
</style>
