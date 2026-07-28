<template>
  <div class="mb-5 flex items-end justify-between gap-4">
    <div>
      <p v-if="eyebrow" class="mb-2 text-xs uppercase tracking-[0.22em] text-gold">{{ eyebrow }}</p>
      <h2 class="font-display text-2xl text-cream md:text-3xl">{{ title }}</h2>
      <p v-if="description" class="mt-2 max-w-2xl text-sm leading-6 text-muted">
        {{ description }}
      </p>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  eyebrow?: string
  title: string
  description?: string
}>()
</script>
