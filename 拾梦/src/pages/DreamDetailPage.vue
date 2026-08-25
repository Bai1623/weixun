<template>
  <section class="detail-page">
    <template v-if="dream">
      <div class="detail-cover glass-card">
        <DreamCover :dream="dream" />
      </div>
      <p class="eyebrow">{{ dream.dreamedAt }}</p>
      <h1 class="page-heading">{{ dream.title || '未命名的梦' }}</h1>
      <p class="dream-text">{{ dream.rawText || '这个梦只留下了声音。' }}</p>

      <section v-if="dream.audioAssetIds.length" class="audio-section glass-card" aria-labelledby="audio-title">
        <h2 id="audio-title">梦里的声音</h2>
        <LocalAudioPlayer v-for="assetId in dream.audioAssetIds" :key="assetId" :asset-id="assetId" />
      </section>
    </template>
    <div v-else class="empty-detail glass-card">
      <p>{{ loading ? '正在寻找这段梦…' : '这段梦境还没有被记录。' }}</p>
      <RouterLink class="quiet-button" to="/home">回到梦河</RouterLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import DreamCover from '@/features/dreams/components/DreamCover.vue'
import { useDreamsStore } from '@/features/dreams/stores/dreams'
import LocalAudioPlayer from '@/features/media/components/LocalAudioPlayer.vue'

const route = useRoute()
const store = useDreamsStore()
const loading = ref(true)
const dream = computed(() => store.savedDreams.find((record) => record.id === route.params.id))

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

.dream-text {
  margin: 1.4rem 0 0;
  color: var(--color-night-soft);
  font-family: var(--font-display);
  font-size: 1.02rem;
  line-height: 2;
  white-space: pre-wrap;
}

.audio-section {
  display: grid;
  gap: 0.85rem;
  margin-top: 1.5rem;
  padding: 1.1rem;
}

.audio-section h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 400;
}
</style>
