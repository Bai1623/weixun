<template>
  <RouterLink
    class="group block overflow-hidden rounded-lg border border-gold/15 bg-walnut/80 shadow-card transition hover:border-gold/40 focus:outline-none focus:ring-2 focus:ring-gold"
    :to="`/cocktails/${cocktail.slug}`"
  >
    <CocktailVisual
      :alt="cocktail.nameZh"
      :image-url="cocktail.imageUrl"
      :tone="cocktail.imageTone"
    />
    <div class="p-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h3 class="font-display text-xl text-cream">{{ cocktail.nameZh }}</h3>
          <p class="text-xs uppercase text-muted">{{ cocktail.nameEn }}</p>
        </div>
        <span class="rounded-md border border-gold/20 px-2 py-1 text-xs text-gold">
          {{ cocktail.prepMinutes }} min
        </span>
      </div>
      <p class="mt-3 line-clamp-2 text-sm leading-6 text-muted">{{ cocktail.shortDescription }}</p>
      <div class="mt-4 flex flex-wrap gap-2">
        <span
          v-for="tag in cocktail.tags.slice(0, 3)"
          :key="tag"
          class="rounded-md bg-cream/5 px-2 py-1 text-xs text-cream/80"
        >
          {{ tag }}
        </span>
      </div>
    </div>
  </RouterLink>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'

import CocktailVisual from '@/components/common/CocktailVisual.vue'
import type { Cocktail } from '@/types/cocktail'

defineProps<{
  cocktail: Cocktail
}>()
</script>
