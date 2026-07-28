<template>
  <div
    class="cocktail-art min-h-48 w-full rounded-lg"
    :class="{ 'cocktail-art--photo': showPhoto }"
    :style="{ '--tone': toneStyle }"
    :aria-label="alt"
  >
    <img
      v-if="showPhoto"
      class="h-full w-full object-cover"
      :alt="alt"
      :src="imageUrl"
      loading="lazy"
      decoding="async"
      @error="imageFailed = true"
    />
    <div v-if="showPhoto" class="cocktail-art__shade" />
    <div v-if="showPhoto" class="cocktail-art__shine" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  tone: string
  alt: string
  imageUrl?: string
}>()

const tones: Record<string, string> = {
  mint: 'linear-gradient(145deg, #263d32, #9fbf8f)',
  lime: 'linear-gradient(145deg, #3c3f1f, #c8a96a)',
  ruby: 'linear-gradient(145deg, #341212, #7a3e2f)',
  amber: 'linear-gradient(145deg, #2a170d, #b66c32)',
  gold: 'linear-gradient(145deg, #3a2a12, #dfc78d)',
  pearl: 'linear-gradient(145deg, #2c2924, #f3ebdd)',
  clear: 'linear-gradient(145deg, #203135, #a7d3c6)',
  lemon: 'linear-gradient(145deg, #2d2c17, #d9c85f)',
  rose: 'linear-gradient(145deg, #351827, #be6a83)',
  copper: 'linear-gradient(145deg, #351c10, #b87333)',
  orange: 'linear-gradient(145deg, #3b1c0c, #e08434)',
  cola: 'linear-gradient(145deg, #170f0c, #5d3424)',
  tropical: 'linear-gradient(145deg, #14342c, #e0a94f)',
  peach: 'linear-gradient(145deg, #3c2118, #f0b37a)',
  berry: 'linear-gradient(145deg, #2a1024, #b84d72)',
  violet: 'linear-gradient(145deg, #221738, #9d8bd3)',
}

const toneStyle = computed(() => tones[props.tone] ?? tones.amber)
const imageFailed = ref(false)
const showPhoto = computed(() => Boolean(props.imageUrl) && !imageFailed.value)

watch(
  () => props.imageUrl,
  () => {
    imageFailed.value = false
  },
)
</script>
