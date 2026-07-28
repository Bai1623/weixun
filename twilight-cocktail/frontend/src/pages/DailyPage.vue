<template>
  <div class="mx-auto max-w-4xl">
    <SectionHeading
      eyebrow="Daily Ritual"
      title="今天会是哪一杯？"
      description="从热门经典中，选出一款适合今晚练习的酒。"
    />
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
