<template>
  <Teleport to="body">
    <div class="consent-backdrop">
      <section
        ref="dialog"
        class="consent-dialog glass-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-title"
        @keydown="trapFocus"
      >
        <p class="eyebrow">Before sending</p>
        <h2 id="consent-title">确认这次 AI 操作</h2>
        <p>这次操作将使用：</p>
        <strong>{{ dataCopy }}</strong>
        <p v-if="isNetworkAction" class="consent-note">内容会发送到你配置的 AI 服务端点；拾梦不会把密钥保存在浏览器中。</p>
        <p v-else class="consent-note">这是本机操作，不会向网络发送内容。</p>
        <footer>
          <button type="button" class="text-button" aria-label="取消 AI 操作" @click="emit('cancel')">取消</button>
          <button type="button" class="primary-button" aria-label="确认 AI 操作" @click="emit('confirm')">确认继续</button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

import type { AiConsentAction } from '../model/ai'

const props = defineProps<{ action: AiConsentAction }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
const dialog = ref<HTMLElement | null>(null)
let previouslyFocused: HTMLElement | null = null

const dataCopy = computed(() => {
  if (props.action === 'organize') return '梦境正文与已选元数据'
  if (props.action === 'transcribe') return '所选录音'
  if (props.action === 'image') return '摘要、情绪与关键词'
  return '当前梦境的本地整理结果'
})
const isNetworkAction = computed(() => ['organize', 'transcribe', 'image'].includes(props.action))

function trapFocus(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('cancel')
    return
  }
  if (event.key !== 'Tab' || !dialog.value) return
  const controls = [...dialog.value.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input, select, textarea')]
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

onMounted(async () => {
  previouslyFocused = document.activeElement as HTMLElement | null
  await nextTick()
  dialog.value?.querySelector<HTMLElement>('button:not(:disabled)')?.focus()
})

onBeforeUnmount(() => previouslyFocused?.focus())
</script>

<style scoped>
.consent-backdrop {
  position: fixed;
  z-index: 10;
  inset: 0;
  display: grid;
  place-items: end center;
  padding: 1rem 1rem calc(1rem + var(--safe-bottom));
  background: rgb(21 24 39 / 45%);
  backdrop-filter: blur(9px);
}

.consent-dialog {
  width: min(100%, 30rem);
  padding: 1.3rem;
  background: rgb(244 242 246 / 96%);
}

.consent-dialog h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.3rem;
  font-weight: 400;
}

.consent-dialog > p:not(.eyebrow) {
  margin: 0.75rem 0 0;
  color: var(--color-ink-muted);
  font-size: 0.72rem;
}

.consent-dialog strong {
  display: block;
  margin-top: 0.4rem;
  font-family: var(--font-display);
  font-weight: 400;
}

.consent-note {
  padding: 0.7rem;
  border-radius: 0.8rem;
  background: rgb(255 255 255 / 42%);
  line-height: 1.6;
}

.consent-dialog footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  margin-top: 1rem;
}

.text-button {
  padding: 0.6rem;
  border: 0;
  background: transparent;
}
</style>
