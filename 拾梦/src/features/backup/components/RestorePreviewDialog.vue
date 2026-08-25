<template>
  <div class="dialog-backdrop" role="presentation">
    <section
      ref="dialog"
      class="restore-dialog glass-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="restore-title"
      @keydown="trapFocus"
    >
      <p class="eyebrow">Restore preview</p>
      <h2 id="restore-title">先看看将恢复什么</h2>
      <p>将恢复 {{ inspection.counts.dreams }} 个梦和 {{ inspection.counts.media }} 个媒体文件</p>
      <ul v-if="inspection.warnings.length">
        <li v-for="warning in inspection.warnings" :key="warning">{{ warning }}</li>
      </ul>
      <p class="restore-dialog__note">恢复会与本机内容合并，不会先清空或静默覆盖已有梦境。</p>
      <footer>
        <button type="button" class="text-button" :disabled="busy" @click="emit('cancel')">取消</button>
        <button
          type="button"
          class="primary-button"
          aria-label="确认恢复"
          :disabled="busy"
          @click="emit('confirm')"
        >
          {{ busy ? '正在恢复…' : '确认恢复' }}
        </button>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

import type { BackupInspection } from '../model/backup'

defineProps<{ inspection: BackupInspection; busy?: boolean }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
const dialog = ref<HTMLElement | null>(null)
let previouslyFocused: HTMLElement | null = null

function trapFocus(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('cancel')
    return
  }
  if (event.key !== 'Tab' || !dialog.value) return
  const controls = [...dialog.value.querySelectorAll<HTMLElement>('button:not(:disabled)')]
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
.dialog-backdrop {
  position: fixed;
  z-index: 8;
  inset: 0;
  display: grid;
  place-items: end center;
  padding: 1rem 1rem calc(1rem + var(--safe-bottom));
  background: rgb(21 24 39 / 38%);
  backdrop-filter: blur(8px);
}

.restore-dialog {
  width: min(100%, 30rem);
  padding: 1.3rem;
  border-radius: 1.5rem;
  background: rgb(244 242 246 / 94%);
}

.restore-dialog h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 400;
}

.restore-dialog > p:not(.eyebrow) {
  margin: 0.7rem 0 0;
  color: var(--color-ink-muted);
  font-size: 0.78rem;
  line-height: 1.65;
}

.restore-dialog__note {
  padding: 0.7rem;
  border-radius: 0.8rem;
  background: rgb(255 255 255 / 42%);
}

.restore-dialog ul {
  color: #713b49;
  font-size: 0.7rem;
}

.restore-dialog footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.7rem;
  margin-top: 1.2rem;
}

.text-button {
  padding: 0.6rem;
  border: 0;
  background: transparent;
}
</style>
