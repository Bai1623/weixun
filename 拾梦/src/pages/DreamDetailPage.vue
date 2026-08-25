<template>
  <section class="detail-page">
    <div v-if="pendingDream" class="undo-toast" role="status">
      <span>梦境已移入雾中</span>
      <button type="button" aria-label="撤销删除" @click="undoDelete">
        <Undo2 :size="16" aria-hidden="true" />
        撤销
      </button>
    </div>

    <template v-if="dream">
      <div class="detail-cover glass-card">
        <DreamCover :dream="dream" />
      </div>

      <header class="detail-heading">
        <div>
          <p class="eyebrow">{{ formattedDate }}</p>
          <h1 class="page-heading">{{ dream.title || '未命名的梦' }}</h1>
        </div>
        <button
          type="button"
          class="icon-button"
          :class="{ 'icon-button--active': dream.favorite }"
          :aria-label="dream.favorite ? '取消收藏梦境' : '收藏梦境'"
          @click="store.toggleFavorite(dream.id)"
        >
          <Heart :size="20" :fill="dream.favorite ? 'currentColor' : 'none'" aria-hidden="true" />
        </button>
      </header>

      <section v-if="dream.summary" class="summary-card glass-card" aria-labelledby="summary-title">
        <h2 id="summary-title">梦的轮廓</h2>
        <p>{{ dream.summary }}</p>
      </section>

      <section class="original-dream" aria-labelledby="original-title">
        <h2 id="original-title">原始梦境</h2>
        <p class="dream-text">{{ dream.rawText || '这个梦只留下了声音。' }}</p>
      </section>

      <dl class="dream-meta glass-card">
        <div><dt>情绪</dt><dd>{{ moodLabel }}</dd></div>
        <div><dt>清晰度</dt><dd>{{ dream.clarity }} / 5</dd></div>
        <div><dt>清醒梦</dt><dd>{{ dream.lucid ? '是' : '否' }}</dd></div>
      </dl>

      <ul v-if="dream.tags.length" class="dream-tags" aria-label="关键词">
        <li v-for="tag in dream.tags" :key="tag">{{ tag }}</li>
      </ul>

      <section v-if="dream.audioAssetIds.length" class="audio-section glass-card" aria-labelledby="audio-title">
        <h2 id="audio-title">梦里的声音</h2>
        <LocalAudioPlayer v-for="assetId in dream.audioAssetIds" :key="assetId" :asset-id="assetId" />
      </section>

      <section class="poster-actions glass-card" aria-labelledby="poster-title">
        <div>
          <h2 id="poster-title">把梦留成一张长图</h2>
          <p>仅导出画面与文字，不包含录音和隐私说明。</p>
        </div>
        <div>
          <button type="button" class="quiet-button" aria-label="导出完整长图" @click="posterMode = 'full'">
            <ImageDown :size="17" aria-hidden="true" />
            导出全文
          </button>
          <button
            v-if="dream.summary"
            type="button"
            class="quiet-button"
            aria-label="导出摘要长图"
            @click="posterMode = 'summary'"
          >
            导出摘要
          </button>
        </div>
      </section>

      <footer class="detail-actions">
        <RouterLink class="quiet-button" :to="`/record/${dream.id}`" aria-label="编辑梦境">
          <PenLine :size="17" aria-hidden="true" />
          编辑
        </RouterLink>
        <button type="button" class="delete-button" aria-label="删除梦境" @click="deleteDream">
          <Trash2 :size="17" aria-hidden="true" />
          删除
        </button>
      </footer>

      <PosterPreviewDialog
        v-if="posterMode"
        :dream="dream"
        :mode="posterMode"
        @close="posterMode = null"
      />
    </template>

    <div v-else-if="pendingDream" class="mist-state glass-card">
      <p>这段梦正在雾中等待片刻。</p>
    </div>

    <div v-else class="empty-detail glass-card">
      <p>{{ loading ? '正在寻找这段梦…' : '这段梦境还没有被记录。' }}</p>
      <RouterLink class="quiet-button" to="/home">回到梦河</RouterLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Heart, ImageDown, PenLine, Trash2, Undo2 } from '@lucide/vue'

import DreamCover from '@/features/dreams/components/DreamCover.vue'
import { useDreamsStore } from '@/features/dreams/stores/dreams'
import PosterPreviewDialog from '@/features/export/components/PosterPreviewDialog.vue'
import type { PosterMode } from '@/features/export/services/posterService'
import LocalAudioPlayer from '@/features/media/components/LocalAudioPlayer.vue'

const route = useRoute()
const store = useDreamsStore()
const loading = ref(true)
const posterMode = ref<PosterMode | null>(null)
const dreamId = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''))
const dream = computed(() => store.savedDreams.find((record) => record.id === dreamId.value))
const pendingDream = computed(() => store.pendingDeletions[dreamId.value])

const moodLabels = {
  neutral: '说不清',
  calm: '平静',
  joyful: '欣喜',
  mysterious: '神秘',
  sad: '难过',
  anxious: '焦虑',
  fearful: '害怕',
  surreal: '超现实',
} as const

const moodLabel = computed(() => (dream.value ? moodLabels[dream.value.mood] : ''))
const formattedDate = computed(() => {
  if (!dream.value) return ''
  const [year, month, day] = dream.value.dreamedAt.split('-')
  return `${year}年${Number(month)}月${Number(day)}日`
})

function deleteDream() {
  if (dream.value) store.scheduleDelete(dream.value.id, 8_000)
}

function undoDelete() {
  store.undoDelete(dreamId.value)
}

onMounted(async () => {
  try {
    await store.load()
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.empty-detail {
  display: grid;
  justify-items: start;
  gap: 1rem;
  margin-top: 2rem;
  padding: 1.5rem;
}

.empty-detail p {
  margin: 0;
  color: var(--color-ink-muted);
}

.detail-page {
  display: grid;
}

.detail-cover {
  height: 18rem;
  margin-bottom: 1.6rem;
  overflow: hidden;
}

.detail-heading {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 1rem;
}

.icon-button {
  display: grid;
  width: 3rem;
  aspect-ratio: 1;
  place-items: center;
  flex: 0 0 auto;
  border: 1px solid var(--color-line);
  border-radius: 50%;
  color: var(--color-ink-muted);
  background: rgb(255 255 255 / 38%);
}

.icon-button--active {
  color: #9b536b;
  background: rgb(215 169 189 / 24%);
}

.summary-card,
.dream-meta,
.audio-section {
  margin-top: 1.5rem;
}

.summary-card {
  padding: 1.1rem 1.2rem;
  border-left: 3px solid rgb(141 82 103 / 45%);
}

.summary-card h2,
.original-dream h2,
.audio-section h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 400;
  letter-spacing: 0.05em;
}

.summary-card p {
  margin: 0.6rem 0 0;
  color: var(--color-ink-muted);
  font-family: var(--font-display);
  font-size: 0.86rem;
  line-height: 1.8;
}

.original-dream {
  margin-top: 1.7rem;
}

.dream-text {
  margin: 0.8rem 0 0;
  color: var(--color-night-soft);
  font-family: var(--font-display);
  font-size: 1.02rem;
  line-height: 2;
  white-space: pre-wrap;
}

.dream-meta {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 0.9rem;
}

.dream-meta div {
  display: grid;
  gap: 0.25rem;
  text-align: center;
}

.dream-meta div + div {
  border-left: 1px solid var(--color-line);
}

.dream-meta dt {
  color: var(--color-ink-muted);
  font-size: 0.6rem;
}

.dream-meta dd {
  margin: 0;
  font-family: var(--font-display);
  font-size: 0.8rem;
}

.dream-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin: 1rem 0 0;
  padding: 0;
  list-style: none;
}

.dream-tags li {
  padding: 0.35rem 0.65rem;
  border: 1px solid var(--color-line);
  border-radius: 999px;
  color: var(--color-ink-muted);
  background: rgb(255 255 255 / 28%);
  font-size: 0.66rem;
}

.audio-section {
  display: grid;
  gap: 0.85rem;
  margin-top: 1.5rem;
  padding: 1.1rem;
}

.audio-section h2 {
  margin-bottom: 0.1rem;
}

.detail-actions {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 2rem;
}

.poster-actions {
  display: grid;
  gap: 0.9rem;
  margin-top: 1.5rem;
  padding: 1rem 1.1rem;
}

.poster-actions h2,
.poster-actions p {
  margin: 0;
}

.poster-actions h2 {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 400;
}

.poster-actions p {
  margin-top: 0.25rem;
  color: var(--color-ink-muted);
  font-size: 0.66rem;
}

.poster-actions > div:last-child {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.delete-button {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.7rem 1rem;
  border: 0;
  color: #8c5364;
  background: transparent;
}

.undo-toast {
  position: fixed;
  z-index: 5;
  right: 1rem;
  bottom: calc(6rem + var(--safe-bottom));
  left: 1rem;
  display: flex;
  width: min(calc(100% - 2rem), 28rem);
  min-height: 3.4rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin: auto;
  padding: 0.65rem 0.8rem 0.65rem 1rem;
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 1rem;
  color: white;
  background: rgb(21 24 39 / 90%);
  box-shadow: var(--shadow-soft);
  backdrop-filter: blur(18px);
  font-size: 0.75rem;
}

.undo-toast button {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.45rem 0.7rem;
  border: 0;
  border-radius: 999px;
  color: var(--color-night);
  background: var(--color-moon);
}

.mist-state {
  margin-top: 4rem;
  padding: 2rem;
  color: var(--color-ink-muted);
  font-family: var(--font-display);
  text-align: center;
}
</style>
