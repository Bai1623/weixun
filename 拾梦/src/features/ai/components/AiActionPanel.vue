<template>
  <section class="ai-panel glass-card" aria-labelledby="ai-panel-title">
    <header>
      <div>
        <p class="eyebrow">Optional AI</p>
        <h2 id="ai-panel-title">替你拾起梦的碎片</h2>
      </div>
      <Sparkles :size="20" aria-hidden="true" />
    </header>

    <template v-if="endpoint">
      <p class="ai-intro">每次发送前都会告诉你所用的数据；结果先预览，由你决定是否留下。</p>
      <div class="ai-actions">
        <button
          type="button"
          class="primary-button"
          aria-label="AI 整理梦境"
          :disabled="ai.busy.value || !dream.rawText.trim()"
          @click="requestAction('organize')"
        >
          <WandSparkles :size="17" aria-hidden="true" />
          整理这场梦
        </button>
        <button
          v-if="dream.audioAssetIds.length"
          type="button"
          class="quiet-button"
          aria-label="AI 转写录音"
          :disabled="ai.busy.value"
          @click="requestAction('transcribe')"
        >
          <AudioLines :size="17" aria-hidden="true" />
          转写录音
        </button>
        <button
          type="button"
          class="quiet-button"
          aria-label="AI 生成梦境图片"
          :disabled="ai.busy.value || (!dream.summary && !dream.rawText.trim())"
          @click="requestAction('image')"
        >
          <ImagePlus :size="17" aria-hidden="true" />
          生成梦境画面
        </button>
      </div>
    </template>

    <div v-else class="ai-unconfigured">
      <p>尚未配置 AI 服务</p>
      <small>离线记录、氛围封面和导出仍可正常使用。</small>
      <a class="quiet-button" href="#/settings">前往设置</a>
    </div>

    <section v-if="ai.organizingCandidate.value" class="candidate" aria-labelledby="organize-preview-title">
      <p class="eyebrow">Preview</p>
      <h3 id="organize-preview-title">{{ ai.organizingCandidate.value.title }}</h3>
      <p>{{ ai.organizingCandidate.value.summary }}</p>
      <ul>
        <li v-for="keyword in ai.organizingCandidate.value.keywords" :key="keyword">{{ keyword }}</li>
      </ul>
      <button
        type="button"
        class="primary-button"
        aria-label="应用 AI 整理"
        :disabled="ai.busy.value"
        @click="ai.applyOrganization(dream)"
      >
        应用这份整理
      </button>
    </section>

    <section v-if="ai.transcriptCandidate.value" class="candidate" aria-labelledby="transcript-preview-title">
      <p class="eyebrow">Transcript preview</p>
      <h3 id="transcript-preview-title">录音转写</h3>
      <p class="transcript">{{ ai.transcriptCandidate.value }}</p>
      <button
        type="button"
        class="primary-button"
        aria-label="应用 AI 转写"
        :disabled="ai.busy.value"
        @click="ai.applyTranscript(dream)"
      >
        添加到原始梦境末尾
      </button>
    </section>

    <div v-if="dream.aiImageAssetId || dream.aiUpdatedAt" class="local-actions">
      <button
        v-if="dream.aiImageAssetId"
        type="button"
        class="text-button"
        aria-label="恢复氛围封面"
        :disabled="ai.busy.value"
        @click="requestAction('restore-cover')"
      >
        恢复氛围封面
      </button>
      <button
        v-if="dream.aiUpdatedAt"
        type="button"
        class="text-button"
        aria-label="清除 AI 整理"
        :disabled="ai.busy.value"
        @click="requestAction('clear-organized')"
      >
        清除整理结果
      </button>
    </div>

    <p v-if="ai.busy.value" class="ai-status" role="status">正在穿过梦雾，请稍候…</p>
    <p v-if="ai.error.value" class="ai-error" role="alert">{{ ai.error.value }}</p>

    <AiConsentDialog
      v-if="pendingAction"
      :action="pendingAction"
      @cancel="pendingAction = null"
      @confirm="confirmAction"
    />
  </section>
</template>

<script setup lang="ts">
import { AudioLines, ImagePlus, Sparkles, WandSparkles } from '@lucide/vue'
import { ref } from 'vue'

import type { DreamRecord } from '@/features/dreams/model/dream'

import { useDreamAi } from '../composables/useDreamAi'
import type { AiConsentAction } from '../model/ai'
import AiConsentDialog from './AiConsentDialog.vue'

const props = defineProps<{
  dream: DreamRecord
  endpoint: string | null
  saveDream?: (record: DreamRecord) => Promise<unknown>
}>()
const emit = defineEmits<{ 'update:dream': [dream: DreamRecord] }>()
const pendingAction = ref<AiConsentAction | null>(null)

const ai = useDreamAi(async (record) => {
  await props.saveDream?.(record)
  emit('update:dream', record)
})

function requestAction(action: AiConsentAction) {
  pendingAction.value = action
}

async function confirmAction() {
  const action = pendingAction.value
  pendingAction.value = null
  if (!action) return

  if (action === 'restore-cover') {
    await ai.restoreAtmosphereCover(props.dream)
    return
  }
  if (action === 'clear-organized') {
    await ai.clearOrganization(props.dream)
    return
  }
  if (!props.endpoint) return
  if (action === 'organize') {
    await ai.organize(props.dream, props.endpoint)
  } else if (action === 'transcribe') {
    const assetId = props.dream.audioAssetIds[0]
    if (assetId) await ai.transcribe(props.dream, props.endpoint, assetId)
  } else {
    await ai.generateImage(props.dream, props.endpoint)
  }
}
</script>

<style scoped>
.ai-panel {
  display: grid;
  gap: 1rem;
  margin-top: 1.5rem;
  padding: 1.1rem;
  background:
    radial-gradient(circle at 92% 0%, rgb(216 181 210 / 32%), transparent 38%),
    rgb(255 255 255 / 33%);
}

.ai-panel > header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  color: #77546d;
}

.ai-panel h2,
.candidate h3 {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 400;
}

.ai-panel h2 {
  color: var(--color-night);
  font-size: 1.08rem;
}

.ai-intro,
.ai-unconfigured p,
.ai-unconfigured small {
  margin: 0;
  color: var(--color-ink-muted);
  font-size: 0.7rem;
  line-height: 1.65;
}

.ai-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.ai-actions button {
  flex: 1 1 9rem;
  justify-content: center;
}

.ai-unconfigured {
  display: grid;
  justify-items: start;
  gap: 0.4rem;
}

.ai-unconfigured > p {
  color: var(--color-night-soft);
  font-family: var(--font-display);
  font-size: 0.88rem;
}

.ai-unconfigured .quiet-button {
  margin-top: 0.35rem;
}

.candidate {
  padding: 0.95rem;
  border: 1px solid rgb(255 255 255 / 48%);
  border-radius: 1rem;
  background: rgb(248 246 251 / 62%);
}

.candidate h3 {
  font-size: 1rem;
}

.candidate > p:not(.eyebrow) {
  margin: 0.5rem 0 0;
  color: var(--color-ink-muted);
  font-family: var(--font-display);
  font-size: 0.78rem;
  line-height: 1.75;
}

.candidate ul {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin: 0.7rem 0;
  padding: 0;
  list-style: none;
}

.candidate li {
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  color: #745568;
  background: rgb(215 169 189 / 18%);
  font-size: 0.62rem;
}

.candidate .primary-button {
  margin-top: 0.6rem;
}

.transcript {
  white-space: pre-wrap;
}

.local-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem;
  padding-top: 0.4rem;
  border-top: 1px solid var(--color-line);
}

.text-button {
  padding: 0.45rem 0.55rem;
  border: 0;
  color: var(--color-ink-muted);
  background: transparent;
  font-size: 0.66rem;
}

.ai-status,
.ai-error {
  margin: 0;
  padding: 0.65rem 0.75rem;
  border-radius: 0.75rem;
  font-size: 0.68rem;
}

.ai-status {
  color: #45665d;
  background: rgb(125 163 151 / 16%);
}

.ai-error {
  color: #713b49;
  background: rgb(215 169 189 / 25%);
}
</style>
