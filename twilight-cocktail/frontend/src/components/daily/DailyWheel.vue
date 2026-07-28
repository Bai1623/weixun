<template>
  <div class="mx-auto max-w-md text-center">
    <div class="relative mx-auto aspect-square w-full max-w-80">
      <div
        class="absolute inset-0 rounded-full border border-gold/40 bg-walnut shadow-card transition-transform ease-out"
        :style="{
          transform: `rotate(${rotation}deg)`,
          transitionDuration: spinning ? '3200ms' : '300ms',
        }"
      >
        <div
          v-for="(item, index) in candidates"
          :key="item.slug"
          class="absolute left-1/2 top-1/2 w-1/2 origin-left text-left text-xs text-cream"
          :style="{ transform: `rotate(${index * segment}deg)` }"
        >
          <span class="ml-8 inline-block max-w-24 truncate rounded-md bg-obsidian/60 px-2 py-1">
            {{ item.nameZh }}
          </span>
        </div>
      </div>
      <div
        class="absolute left-1/2 top-0 z-10 h-8 w-4 -translate-x-1/2 bg-gold [clip-path:polygon(50%_100%,0_0,100%_0)]"
      />
    </div>
    <button
      class="mt-6 rounded-md bg-gold px-6 py-3 text-sm font-semibold text-obsidian transition hover:bg-gold/90 focus:outline-none focus:ring-2 focus:ring-cream disabled:cursor-not-allowed disabled:opacity-60"
      type="button"
      :disabled="spinning"
      @click="$emit('spin')"
    >
      {{ spinning ? '正在选择' : '开始选择' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { Cocktail } from '@/types/cocktail'

const props = defineProps<{
  candidates: Cocktail[]
  rotation: number
  spinning: boolean
}>()

defineEmits<{
  spin: []
}>()

const segment = computed(() => 360 / props.candidates.length)
</script>
