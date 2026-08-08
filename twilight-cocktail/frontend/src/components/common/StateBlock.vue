<template>
  <div class="ui-panel p-5 text-sm text-muted" role="status">
    <p class="font-medium text-cream">{{ title }}</p>
    <p class="mt-2">{{ message }}</p>
    <button
      v-if="actionLabel"
      class="ui-button-secondary mt-4 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
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
