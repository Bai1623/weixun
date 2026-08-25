<template>
  <section class="home-page">
    <div class="home-page__heading">
      <div>
        <p class="eyebrow">Dream river</p>
        <h1 class="page-heading">{{ sortedDreams.length ? '梦从这里，缓缓流过。' : '今晚的梦，会漂向哪里？' }}</h1>
      </div>
      <span class="date-mark" :aria-label="sortedDreams.length ? `${sortedDreams.length} 个梦` : '今天'">
        {{ sortedDreams.length || '今夜' }}
      </span>
    </div>

    <div v-if="loadError" class="load-error glass-card" role="alert">
      <p>本地梦境暂时没有展开。</p>
      <button type="button" class="quiet-button" @click="loadDreams">重新尝试</button>
    </div>

    <template v-else-if="sortedDreams.length">
      <div class="river-horizon glass-card" aria-hidden="true">
        <span class="river-horizon__moon" />
        <span class="river-horizon__line" />
      </div>

      <div class="dream-stream" aria-label="保存的梦境">
        <DreamCard v-for="dream in sortedDreams" :key="dream.id" :dream="dream" />
      </div>
    </template>

    <div v-else class="dream-river glass-card">
      <div class="dream-river__sky" aria-hidden="true">
        <i v-for="star in 7" :key="star" :class="`star star--${star}`" />
        <span class="far-moon" />
      </div>
      <div class="dream-river__water" aria-hidden="true" />
      <div class="dream-river__empty">
        <p>这里还没有梦的倒影</p>
        <span>醒来时，先记下一个画面或一句话就好。</span>
        <RouterLink class="primary-button" to="/record">拾起第一个梦</RouterLink>
      </div>
    </div>

    <footer class="privacy-note">仅保存在此设备 · 你的梦只属于你</footer>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import DreamCard from '@/features/dreams/components/DreamCard.vue'
import { useDreamsStore } from '@/features/dreams/stores/dreams'

const store = useDreamsStore()
const loadError = ref(false)

const sortedDreams = computed(() =>
  [...store.savedDreams].sort(
    (first, second) =>
      second.dreamedAt.localeCompare(first.dreamedAt) || second.createdAt.localeCompare(first.createdAt),
  ),
)

async function loadDreams() {
  loadError.value = false
  try {
    await store.load()
  } catch {
    loadError.value = true
  }
}

onMounted(loadDreams)
</script>

<style scoped>
.home-page {
  display: grid;
  gap: 1.4rem;
}

.home-page__heading {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 1rem;
}

.date-mark {
  display: grid;
  width: 3.2rem;
  aspect-ratio: 1;
  place-items: center;
  flex: 0 0 auto;
  margin-top: 0.3rem;
  border: 1px solid rgb(255 255 255 / 62%);
  border-radius: 50%;
  color: var(--color-ink-muted);
  background: rgb(255 255 255 / 32%);
  font-family: var(--font-display);
  font-size: 0.78rem;
  letter-spacing: 0.12em;
}

.load-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.2rem;
}

.load-error p {
  margin: 0;
  color: var(--color-ink-muted);
  font-size: 0.78rem;
}

.river-horizon {
  position: relative;
  min-height: 8.5rem;
  overflow: hidden;
  background:
    radial-gradient(circle at 22% 70%, rgb(255 239 223 / 56%), transparent 25%),
    linear-gradient(165deg, #aeb3c4 0 48%, #7d869e 49%, #c3c8d4 100%);
}

.river-horizon__moon {
  position: absolute;
  top: 1.2rem;
  right: 18%;
  width: 2.8rem;
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--color-moon);
  box-shadow: 0 0 2.5rem 0.9rem rgb(255 248 232 / 62%);
}

.river-horizon__line {
  position: absolute;
  right: 0;
  bottom: 27%;
  left: 0;
  height: 1px;
  background: rgb(255 255 255 / 42%);
  box-shadow: 0 0.85rem 0 rgb(255 255 255 / 16%), 0 1.7rem 0 rgb(255 255 255 / 11%);
}

.dream-stream {
  display: grid;
  gap: 1rem;
}

.dream-stream > :nth-child(even) {
  margin-left: clamp(0rem, 4vw, 1.4rem);
}

.dream-river {
  position: relative;
  min-height: 23rem;
  overflow: hidden;
  background: linear-gradient(180deg, #dcdbe5 0%, #b4b7c8 47%, #8d94aa 49%, #cad0da 100%);
}

.dream-river__sky {
  position: absolute;
  inset: 0 0 50%;
  background:
    radial-gradient(circle at 18% 70%, rgb(255 237 223 / 76%), transparent 24%),
    linear-gradient(155deg, #b8bccb, #e5dce2 58%, #f3e6dc);
}

.dream-river__water {
  position: absolute;
  inset: 50% 0 0;
  background:
    repeating-linear-gradient(178deg, transparent 0 12px, rgb(255 255 255 / 18%) 13px 14px),
    linear-gradient(165deg, #8991a5, #c8ccd6 48%, #a7aebd);
}

.far-moon {
  position: absolute;
  top: 23%;
  right: 18%;
  width: 3.4rem;
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--color-moon);
  box-shadow: 0 0 3rem 1.2rem rgb(255 248 232 / 62%);
}

.star {
  position: absolute;
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 0 7px white;
}

.star--1 { top: 19%; left: 18%; }
.star--2 { top: 32%; left: 33%; }
.star--3 { top: 15%; left: 55%; }
.star--4 { top: 41%; left: 72%; }
.star--5 { top: 27%; left: 83%; }
.star--6 { top: 57%; left: 12%; }
.star--7 { top: 63%; left: 89%; }

.dream-river__empty {
  position: absolute;
  right: 1.2rem;
  bottom: 1.2rem;
  left: 1.2rem;
  display: grid;
  justify-items: start;
  padding: 1.25rem;
  border: 1px solid rgb(255 255 255 / 36%);
  border-radius: 1.35rem;
  color: white;
  background: rgb(26 29 47 / 48%);
  backdrop-filter: blur(14px);
}

.dream-river__empty p {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.25rem;
  letter-spacing: 0.06em;
}

.dream-river__empty span {
  margin: 0.45rem 0 1rem;
  color: rgb(255 255 255 / 72%);
  font-size: 0.8rem;
  line-height: 1.6;
}

.dream-river__empty .primary-button {
  color: var(--color-night);
  border-color: var(--color-moon);
  background: var(--color-moon);
  box-shadow: none;
}

.privacy-note {
  color: var(--color-ink-muted);
  font-size: 0.7rem;
  text-align: center;
  letter-spacing: 0.08em;
}
</style>
