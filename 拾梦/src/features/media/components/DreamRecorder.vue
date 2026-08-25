<template>
  <section class="dream-recorder glass-card" aria-labelledby="recorder-title">
    <div class="dream-recorder__copy">
      <span class="dream-recorder__icon" aria-hidden="true"><AudioLines :size="20" /></span>
      <div>
        <h2 id="recorder-title">留下一段梦话</h2>
        <p>{{ stateCopy }}</p>
      </div>
    </div>

    <div class="dream-recorder__actions">
      <button
        v-if="recorder.state.value === 'idle' || recorder.state.value === 'ready' || recorder.state.value === 'error'"
        type="button"
        class="record-button"
        aria-label="开始录音"
        @click="recorder.start"
      >
        <Circle :size="18" fill="currentColor" aria-hidden="true" />
        录音
      </button>

      <template v-else-if="recorder.state.value === 'recording'">
        <button type="button" class="quiet-button" aria-label="暂停录音" @click="recorder.pause">
          <Pause :size="18" aria-hidden="true" />
        </button>
        <button type="button" class="record-button" aria-label="完成录音" @click="complete">
          <Square :size="16" fill="currentColor" aria-hidden="true" />
          完成
        </button>
        <button type="button" class="text-button" @click="recorder.cancel">取消</button>
      </template>

      <template v-else-if="recorder.state.value === 'paused'">
        <button type="button" class="quiet-button" aria-label="继续录音" @click="recorder.resume">
          <Play :size="18" fill="currentColor" aria-hidden="true" />
        </button>
        <button type="button" class="record-button" aria-label="完成录音" @click="complete">完成</button>
        <button type="button" class="text-button" @click="recorder.cancel">取消</button>
      </template>

      <span v-else class="saving-state">{{ recorder.state.value === 'requesting' ? '等待授权…' : '保存中…' }}</span>
    </div>

    <audio v-if="recorder.previewUrl.value" :src="recorder.previewUrl.value" controls preload="metadata" />

    <p v-if="recorder.error.value" class="recorder-error" role="alert">{{ recorder.error.value }}</p>
    <div v-if="recorder.pendingRecording.value" class="retry-actions">
      <button type="button" class="quiet-button" @click="retry">重新保存</button>
      <button type="button" class="text-button" @click="recorder.discardPending">放弃这段录音</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AudioLines, Circle, Pause, Play, Square } from '@lucide/vue'

import type { DreamRecord } from '@/features/dreams/model/dream'
import { useDreamRecorder } from '../composables/useDreamRecorder'

const props = defineProps<{ dream: DreamRecord }>()
const emit = defineEmits<{ 'update:dream': [dream: DreamRecord] }>()
const recorder = useDreamRecorder()

const stateCopy = computed(() => {
  switch (recorder.state.value) {
    case 'recording':
      return '正在收集醒来前的声音'
    case 'paused':
      return '录音已暂停'
    case 'saving':
      return '只保存在这台设备上'
    case 'ready':
      return '录音已经收进这个梦里'
    case 'requesting':
      return '需要你允许使用麦克风'
    default:
      return '不想打字时，就说给自己听'
  }
})

async function complete() {
  const updated = await recorder.stopAndSave(props.dream)
  if (updated) emit('update:dream', updated)
}

async function retry() {
  const updated = await recorder.retrySave(props.dream)
  if (updated) emit('update:dream', updated)
}
</script>

<style scoped>
.dream-recorder {
  display: grid;
  gap: 1rem;
  margin-top: 1.2rem;
  padding: 1rem 1.1rem;
  border-radius: 1.35rem;
}

.dream-recorder__copy {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.dream-recorder__icon {
  display: grid;
  width: 2.7rem;
  aspect-ratio: 1;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 50%;
  color: var(--color-night);
  background: rgb(215 169 189 / 28%);
}

.dream-recorder h2,
.dream-recorder p {
  margin: 0;
}

.dream-recorder h2 {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 400;
  letter-spacing: 0.05em;
}

.dream-recorder__copy p {
  margin-top: 0.2rem;
  color: var(--color-ink-muted);
  font-size: 0.68rem;
}

.dream-recorder__actions,
.retry-actions {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.record-button,
.text-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  border-radius: 999px;
}

.record-button {
  padding: 0.65rem 1rem;
  border: 0;
  color: white;
  background: #8d5267;
}

.text-button {
  padding: 0.55rem;
  border: 0;
  color: var(--color-ink-muted);
  background: transparent;
  font-size: 0.7rem;
}

.saving-state {
  color: var(--color-ink-muted);
  font-size: 0.7rem;
}

.dream-recorder audio {
  width: 100%;
  height: 2.7rem;
}

.recorder-error {
  padding: 0.7rem 0.85rem;
  border-radius: 0.8rem;
  color: #713b49;
  background: rgb(215 169 189 / 30%);
  font-size: 0.7rem;
  line-height: 1.5;
}
</style>
