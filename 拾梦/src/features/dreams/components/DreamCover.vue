<template>
  <canvas
    ref="canvas"
    class="dream-cover"
    :aria-hidden="decorative ? 'true' : undefined"
    :aria-label="decorative ? undefined : `梦境封面：${dream.title || '未命名的梦'}`"
    :role="decorative ? undefined : 'img'"
  />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { createCoverScene } from '../cover/coverScene'
import { renderDreamCover } from '../cover/renderDreamCover'
import type { DreamRecord } from '../model/dream'

const props = withDefaults(defineProps<{ dream: DreamRecord; decorative?: boolean }>(), {
  decorative: false,
})

const canvas = ref<HTMLCanvasElement | null>(null)
let observer: ResizeObserver | undefined

function draw() {
  if (!canvas.value) return
  const bounds = canvas.value.getBoundingClientRect()
  if (!bounds.width || !bounds.height) return
  renderDreamCover(canvas.value, createCoverScene(props.dream), {
    width: bounds.width,
    height: bounds.height,
    pixelRatio: window.devicePixelRatio || 1,
  })
}

onMounted(() => {
  draw()
  if ('ResizeObserver' in window) {
    observer = new ResizeObserver(draw)
    observer.observe(canvas.value!)
  }
})

watch(() => props.dream, draw, { deep: true })

onBeforeUnmount(() => observer?.disconnect())
</script>

<style scoped>
.dream-cover {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
