<template>
  <div
    class="rounded-lg border border-gold/20 bg-walnut/80 p-5 text-sm text-muted shadow-glow"
    role="status"
  >
    <p class="font-medium text-cream">{{ title }}</p>
    <p class="mt-2">{{ message }}</p>
    <button
      v-if="actionLabel"
      class="mt-4 rounded-md border border-gold/30 px-4 py-2 text-gold transition hover:bg-gold/10 focus:outline-none focus:ring-2 focus:ring-gold"
      type="button"
      @click="$emit('action')"
    >
      {{ actionLabel }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  message: string
  actionLabel?: string
}>()

defineEmits<{
  action: []
}>()
</script>
