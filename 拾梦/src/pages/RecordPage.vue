<template>
  <section class="record-page">
    <p class="eyebrow">Capture a dream</p>
    <h1 class="page-heading">趁梦还在，<br />把它留在这里。</h1>
    <p class="page-intro">不用完整，也不必解释。一个场景、一种颜色，或醒来时残留的情绪，都值得被记住。</p>

    <p v-if="loading" class="loading-note">正在展开昨夜的梦…</p>
    <DreamEditor
      v-else-if="draft"
      v-model="draft"
      :is-saving="autosave.isSaving.value"
      :warning="warning"
      @save="publishDream"
    />
    <div v-else class="open-error glass-card" role="alert">
      <p>{{ openError || '暂时无法打开记录页，请稍后再试。' }}</p>
      <button type="button" class="quiet-button" @click="initialize">重新尝试</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import DreamEditor from '@/features/dreams/components/DreamEditor.vue'
import { useDraftAutosave } from '@/features/dreams/composables/useDraftAutosave'
import type { DreamRecord } from '@/features/dreams/model/dream'
import { useDreamsStore } from '@/features/dreams/stores/dreams'

const route = useRoute()
const router = useRouter()
const store = useDreamsStore()
const loading = ref(true)
const openError = ref<string | null>(null)
const actionError = ref<string | null>(null)

const draft = computed<DreamRecord | null>({
  get: () => store.activeDraft,
  set: (record) => {
    store.activeDraft = record
  },
})

const autosave = useDraftAutosave(draft, (record) => store.saveDraft(record), 400)
const warning = computed(() => actionError.value ?? autosave.error.value ?? store.storageError)

async function initialize() {
  loading.value = true
  openError.value = null
  try {
    await store.load()
    const routeId = typeof route.params.id === 'string' ? route.params.id : undefined
    await store.openDraft(routeId)
  } catch {
    if (!store.activeDraft) openError.value = '本地草稿暂时无法创建，请检查浏览器存储空间。'
  } finally {
    loading.value = false
  }
}

async function publishDream(record: DreamRecord) {
  actionError.value = null
  await autosave.flush()
  try {
    const saved = await store.publish(record)
    await router.push(`/dream/${saved.id}`)
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '保存失败，请稍后再试'
  }
}

onMounted(initialize)
</script>

<style scoped>
.record-page {
  display: grid;
  padding-bottom: 4.5rem;
}

.loading-note {
  margin-top: 2rem;
  color: var(--color-ink-muted);
  font-family: var(--font-display);
  letter-spacing: 0.08em;
}

.open-error {
  display: grid;
  justify-items: start;
  gap: 1rem;
  margin-top: 2rem;
  padding: 1.2rem;
}

.open-error p {
  margin: 0;
  color: #713b49;
}
</style>
