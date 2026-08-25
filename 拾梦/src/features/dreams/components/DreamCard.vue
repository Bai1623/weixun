<template>
  <RouterLink :to="`/dream/${dream.id}`" class="dream-card glass-card" data-testid="dream-card">
    <div class="dream-card__cover">
      <DreamCover :dream="dream" decorative />
      <span v-if="dream.favorite" class="dream-card__favorite" aria-label="已收藏">✦</span>
    </div>
    <div class="dream-card__body">
      <div class="dream-card__meta">
        <time :datetime="dream.dreamedAt">{{ formattedDate }}</time>
        <span>{{ moodLabel }}</span>
      </div>
      <h2>{{ dream.title || '未命名的梦' }}</h2>
      <p>{{ excerpt }}</p>
      <ul v-if="dream.tags.length" aria-label="关键词">
        <li v-for="tag in dream.tags.slice(0, 3)" :key="tag">{{ tag }}</li>
      </ul>
    </div>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { DreamRecord } from '../model/dream'
import DreamCover from './DreamCover.vue'

const props = defineProps<{ dream: DreamRecord }>()

const moodLabels: Record<DreamRecord['mood'], string> = {
  neutral: '说不清',
  calm: '平静',
  joyful: '欣喜',
  mysterious: '神秘',
  sad: '难过',
  anxious: '焦虑',
  fearful: '害怕',
  surreal: '超现实',
}

const formattedDate = computed(() => {
  const [, month, day] = props.dream.dreamedAt.split('-')
  return `${Number(month)}月${Number(day)}日`
})

const moodLabel = computed(() => moodLabels[props.dream.mood])
const excerpt = computed(() => props.dream.summary?.trim() || props.dream.rawText.trim() || '只留下了一段声音')
</script>

<style scoped>
.dream-card {
  display: grid;
  grid-template-columns: minmax(7.4rem, 38%) 1fr;
  min-height: 10.5rem;
  overflow: hidden;
  color: var(--color-night);
  text-decoration: none;
  transition: transform 180ms ease, box-shadow 180ms ease;
}

.dream-card:active {
  transform: scale(0.988);
}

.dream-card__cover {
  position: relative;
  min-height: 10.5rem;
  overflow: hidden;
}

.dream-card__favorite {
  position: absolute;
  top: 0.7rem;
  right: 0.7rem;
  display: grid;
  width: 1.8rem;
  aspect-ratio: 1;
  place-items: center;
  border-radius: 50%;
  color: var(--color-moon);
  background: rgb(21 24 39 / 34%);
  backdrop-filter: blur(8px);
}

.dream-card__body {
  min-width: 0;
  padding: 1rem;
}

.dream-card__meta {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  color: var(--color-ink-muted);
  font-size: 0.62rem;
  letter-spacing: 0.06em;
}

.dream-card h2 {
  margin: 0.75rem 0 0.45rem;
  overflow: hidden;
  font-family: var(--font-display);
  font-size: 1.2rem;
  font-weight: 400;
  letter-spacing: 0.04em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dream-card p {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: var(--color-ink-muted);
  font-family: var(--font-display);
  font-size: 0.78rem;
  line-height: 1.65;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.dream-card ul {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin: 0.8rem 0 0;
  padding: 0;
  list-style: none;
}

.dream-card li {
  padding: 0.2rem 0.45rem;
  border-radius: 999px;
  color: var(--color-ink-muted);
  background: rgb(255 255 255 / 48%);
  font-size: 0.58rem;
}

@media (prefers-reduced-motion: reduce) {
  .dream-card {
    transition: none;
  }
}
</style>
