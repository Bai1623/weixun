<template>
  <div class="daily-page">
    <div class="daily-page__intro">
      <SectionHeading
        eyebrow="Daily Ritual"
        title="今天会是哪一杯？"
        description="从完整酒单中，让星屑为今晚筛选一杯。"
      />
    </div>
    <DailyWheel
      :candidates="wheelCandidates"
      :selected="selected"
      :spinning="spinning"
      @reroll="reroll"
      @spin="spin"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import SectionHeading from '@/components/common/SectionHeading.vue'
import DailyWheel from '@/components/daily/DailyWheel.vue'
import { useCocktailStore } from '@/stores/cocktails'
import { useDailyPickStore } from '@/stores/daily'
import { useUserStore } from '@/stores/user'
import type { Cocktail } from '@/types/cocktail'

const daily = useDailyPickStore()
const user = useUserStore()
const cocktailStore = useCocktailStore()
const spinning = ref(false)
const selected = ref<Cocktail | undefined>(daily.selected)
const wheelCandidates = computed(() => cocktailStore.items)

const spin = async () => {
  if (spinning.value) return
  spinning.value = true
  selected.value = undefined
  const userId = await user.ensureRemoteUser()
  const cocktail = await daily.reveal(user.anonymousKey, userId)
  window.setTimeout(() => {
    selected.value = cocktail
    spinning.value = false
  }, 3300)
}

const reroll = () => {
  if (spinning.value) return
  spinning.value = true
  selected.value = undefined
  const cocktail = daily.reroll(user.anonymousKey)
  window.setTimeout(() => {
    selected.value = cocktail
    spinning.value = false
  }, 3300)
}

onMounted(() => {
  void cocktailStore.fetchAll()
})
</script>

<style scoped>
.daily-page {
  display: grid;
  min-height: calc(100vh - 8.5rem);
  grid-template-rows: auto 1fr;
  padding-bottom: 2rem;
}

.daily-page__intro {
  width: min(42rem, 100%);
  padding-left: clamp(0rem, 2vw, 1.4rem);
}

@media (max-width: 768px) {
  .daily-page {
    min-height: calc(100vh - 8rem);
    padding-bottom: 5.5rem;
  }

  .daily-page__intro {
    padding-left: 0;
  }
}
</style>
