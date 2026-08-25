<template>
  <div class="poster-backdrop">
    <section
      ref="dialog"
      class="poster-dialog"
      role="dialog"
      aria-modal="true"
      aria-label="梦境长图预览"
      @keydown="trapFocus"
    >
      <header>
        <div>
          <p class="eyebrow">Poster preview</p>
          <h2>梦境长图</h2>
          <span v-if="urls.length">共 {{ urls.length }} 页 · 1080px 宽</span>
        </div>
        <button type="button" class="close-button" aria-label="关闭长图预览" @click="emit('close')">
          <X :size="20" aria-hidden="true" />
        </button>
      </header>

      <div v-if="loading" class="poster-state">正在把梦铺成纸页…</div>
      <div v-else-if="error" class="poster-state poster-state--error" role="alert">{{ error }}</div>
      <div v-else class="poster-pages">
        <figure v-for="(url, index) in urls" :key="url">
          <img :src="url" :alt="`梦境长图第 ${index + 1} 页`" />
          <figcaption>{{ index + 1 }} / {{ urls.length }}</figcaption>
        </figure>
      </div>

      <footer v-if="urls.length">
        <button type="button" class="primary-button" aria-label="下载全部长图" @click="downloadAll">
          <Download :size="17" aria-hidden="true" />
          {{ urls.length === 1 ? '下载长图' : `下载全部 ${urls.length} 张` }}
        </button>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { Download, X } from '@lucide/vue'

import type { DreamRecord } from '@/features/dreams/model/dream'
import { renderDreamPosters, type PosterMode } from '../services/posterService'

const props = defineProps<{ dream: DreamRecord; mode: PosterMode }>()
const emit = defineEmits<{ close: [] }>()
const blobs = ref<Blob[]>([])
const urls = ref<string[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const dialog = ref<HTMLElement | null>(null)
let previouslyFocused: HTMLElement | null = null

onMounted(async () => {
  previouslyFocused = document.activeElement as HTMLElement | null
  await nextTick()
  dialog.value?.querySelector<HTMLElement>('button:not(:disabled)')?.focus()
  try {
    blobs.value = await renderDreamPosters(props.dream, props.mode)
    urls.value = blobs.value.map((blob) => URL.createObjectURL(blob))
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '长图生成失败'
  } finally {
    loading.value = false
  }
})

function downloadAll() {
  const safeTitle = (props.dream.title?.trim() || '未命名的梦').replace(/[\\/:*?"<>|]/g, '-')
  const baseName = `拾梦-${props.dream.dreamedAt}-${safeTitle}`
  urls.value.forEach((url, index) => {
    const link = document.createElement('a')
    link.href = url
    link.download = urls.value.length === 1 ? `${baseName}.png` : `${baseName}-${index + 1}.png`
    link.click()
  })
}

function trapFocus(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
    return
  }
  if (event.key !== 'Tab' || !dialog.value) return
  const controls = [...dialog.value.querySelectorAll<HTMLElement>('button:not(:disabled), [href]')]
  const first = controls[0]
  const last = controls[controls.length - 1]
  if (!first || !last) return
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

onBeforeUnmount(() => {
  urls.value.forEach((url) => URL.revokeObjectURL(url))
  previouslyFocused?.focus()
})
</script>

<style scoped>
.poster-backdrop {
  position: fixed;
  z-index: 9;
  inset: 0;
  background: rgb(21 24 39 / 55%);
  backdrop-filter: blur(10px);
}

.poster-dialog {
  display: grid;
  grid-template-rows: auto 1fr auto;
  width: min(100%, 42rem);
  height: 100dvh;
  margin: auto;
  padding: calc(1rem + env(safe-area-inset-top, 0px)) 1rem calc(1rem + var(--safe-bottom));
  color: var(--color-night);
  background: #e9e7ec;
}

.poster-dialog > header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 0.8rem;
}

.poster-dialog h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 400;
}

.poster-dialog header span {
  color: var(--color-ink-muted);
  font-size: 0.65rem;
}

.close-button {
  display: grid;
  width: 2.75rem;
  aspect-ratio: 1;
  place-items: center;
  border: 1px solid var(--color-line);
  border-radius: 50%;
  background: rgb(255 255 255 / 42%);
}

.poster-pages {
  display: grid;
  align-content: start;
  gap: 1rem;
  overflow-y: auto;
  padding: 0.5rem;
}

.poster-pages figure {
  margin: 0;
}

.poster-pages img {
  display: block;
  width: 100%;
  border-radius: 0.65rem;
  box-shadow: 0 1rem 2.5rem rgb(21 24 39 / 16%);
}

.poster-pages figcaption {
  margin-top: 0.35rem;
  color: var(--color-ink-muted);
  font-size: 0.62rem;
  text-align: center;
}

.poster-state {
  display: grid;
  place-items: center;
  color: var(--color-ink-muted);
  font-family: var(--font-display);
}

.poster-state--error {
  color: #713b49;
}

.poster-dialog > footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 0.8rem;
}
</style>
