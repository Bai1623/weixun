<template>
  <div class="local-audio">
    <audio v-if="sourceUrl" :src="sourceUrl" controls preload="metadata" />
    <p v-else-if="error" role="alert">{{ error }}</p>
    <p v-else>正在读取本地录音…</p>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

import { openShimengDb } from '@/core/persistence/db'
import { createMediaRepository } from '../data/mediaRepository'

const props = defineProps<{ assetId: string }>()
const sourceUrl = ref<string | null>(null)
const error = ref<string | null>(null)

onMounted(async () => {
  const repository = createMediaRepository(await openShimengDb())
  const asset = await repository.get(props.assetId)
  if (!asset || asset.kind !== 'audio') {
    error.value = '这段本地录音暂时无法读取'
    return
  }
  sourceUrl.value = URL.createObjectURL(asset.blob)
})

onBeforeUnmount(() => {
  if (sourceUrl.value) URL.revokeObjectURL(sourceUrl.value)
})
</script>

<style scoped>
.local-audio,
.local-audio audio {
  width: 100%;
}

.local-audio p {
  margin: 0;
  color: var(--color-ink-muted);
  font-size: 0.72rem;
}
</style>
