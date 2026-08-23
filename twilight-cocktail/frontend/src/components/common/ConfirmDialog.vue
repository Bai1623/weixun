<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/75 px-4 backdrop-blur-sm"
    role="presentation"
    @click.self="$emit('cancel')"
  >
    <div
      data-testid="app-confirm-dialog"
      class="w-full max-w-md rounded-lg border border-gold/20 bg-walnut p-5 shadow-2xl shadow-black/40"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-xs uppercase tracking-[0.22em] text-gold">{{ eyebrow }}</p>
          <h3 :id="titleId" class="mt-2 font-display text-2xl text-cream">{{ title }}</h3>
        </div>
        <button
          class="rounded-md border border-gold/20 p-2 text-gold transition hover:bg-gold/10"
          type="button"
          aria-label="关闭确认窗口"
          :disabled="pending"
          @click="$emit('cancel')"
        >
          <X class="h-4 w-4" />
        </button>
      </div>
      <p class="mt-3 whitespace-pre-line text-sm leading-6 text-muted">{{ message }}</p>
      <div class="mt-5 grid gap-3" :class="alternativeLabel ? 'sm:grid-cols-3' : 'sm:grid-cols-2'">
        <button
          class="inline-flex items-center justify-center rounded-md border border-gold/30 px-4 py-3 text-sm text-gold transition hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          :disabled="pending"
          @click="$emit('cancel')"
        >
          {{ cancelLabel }}
        </button>
        <button
          v-if="alternativeLabel"
          class="inline-flex items-center justify-center rounded-md border border-gold/30 px-4 py-3 text-sm text-cream transition hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          :disabled="pending"
          @click="$emit('alternative')"
        >
          {{ alternativeLabel }}
        </button>
        <button
          data-testid="app-confirm-submit"
          class="inline-flex items-center justify-center rounded-md px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
          :class="
            tone === 'danger'
              ? 'bg-wine text-cream hover:bg-wine/80'
              : 'bg-gold text-obsidian hover:bg-cream'
          "
          type="button"
          :disabled="pending"
          @click="$emit('confirm')"
        >
          {{ pending ? pendingLabel : confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    titleId: string
    eyebrow?: string
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    alternativeLabel?: string
    pendingLabel?: string
    pending?: boolean
    tone?: 'default' | 'danger'
  }>(),
  {
    eyebrow: 'Notice',
    confirmLabel: '确认',
    cancelLabel: '取消',
    alternativeLabel: '',
    pendingLabel: '处理中',
    pending: false,
    tone: 'default',
  },
)

defineEmits<{
  confirm: []
  cancel: []
  alternative: []
}>()
</script>
