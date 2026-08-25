<template>
  <form id="dream-editor-form" class="dream-editor glass-card" @submit.prevent="emit('save', modelValue)">
    <label class="title-field">
      <span>标题 <i>可稍后整理</i></span>
      <input
        name="title"
        type="text"
        :value="modelValue.title ?? ''"
        placeholder="给这个梦一个名字"
        @input="updateTitle"
      />
    </label>

    <label class="text-field">
      <span>梦境碎片</span>
      <textarea
        name="rawText"
        :value="modelValue.rawText"
        placeholder="我梦见……"
        autofocus
        @input="updateField('rawText', inputValue($event))"
      />
    </label>

    <DreamMetaFields :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)" />

    <p v-if="warning" class="save-warning" role="alert">{{ warning }}</p>

  </form>

  <Teleport to="body">
    <footer class="editor-actions">
      <span>{{ isSaving ? '正在把梦放进本机…' : '草稿自动保存在此设备' }}</span>
      <button type="submit" form="dream-editor-form" class="primary-button">保存梦境</button>
    </footer>
  </Teleport>
</template>

<script setup lang="ts">
import DreamMetaFields from './DreamMetaFields.vue'
import type { DreamRecord } from '../model/dream'

const props = defineProps<{
  modelValue: DreamRecord
  isSaving?: boolean
  warning?: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [record: DreamRecord]
  save: [record: DreamRecord]
}>()

function inputValue(event: Event): string {
  return (event.target as HTMLInputElement).value
}

function updateField<Key extends keyof DreamRecord>(key: Key, value: DreamRecord[Key]) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

function updateTitle(event: Event) {
  const title = inputValue(event).trimStart()
  updateField('title', title || null)
}
</script>

<style scoped>
.dream-editor {
  display: grid;
  gap: 1.2rem;
  margin-top: 1.8rem;
  padding: 1.2rem;
}

.title-field,
.text-field {
  display: grid;
  gap: 0.55rem;
}

.title-field span,
.text-field span {
  font-family: var(--font-display);
  font-size: 1rem;
  letter-spacing: 0.08em;
}

.title-field i {
  margin-left: 0.35rem;
  color: var(--color-ink-muted);
  font-family: var(--font-body);
  font-size: 0.62rem;
  font-style: normal;
  letter-spacing: 0.03em;
}

.title-field input,
.text-field textarea {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  font-family: var(--font-display);
}

.title-field input {
  min-height: 3rem;
  border-bottom: 1px solid var(--color-line);
  font-size: 1.15rem;
}

.text-field textarea {
  min-height: 11rem;
  resize: vertical;
  font-size: 1.08rem;
  line-height: 1.9;
}

.title-field input::placeholder,
.text-field textarea::placeholder {
  color: rgb(111 112 128 / 50%);
}

.save-warning {
  margin: 0;
  padding: 0.75rem 0.9rem;
  border-radius: 0.85rem;
  color: #713b49;
  background: rgb(215 169 189 / 30%);
  font-size: 0.72rem;
  line-height: 1.5;
}

.editor-actions {
  position: fixed;
  z-index: 2;
  right: 1rem;
  bottom: calc(5.8rem + var(--safe-bottom));
  left: 1rem;
  display: flex;
  width: min(calc(100% - 2rem), 43rem);
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  margin: auto;
  padding: 0.55rem;
  border: 1px solid rgb(255 255 255 / 44%);
  border-radius: 999px;
  background: rgb(242 240 244 / 82%);
  backdrop-filter: blur(18px);
}

.editor-actions > span {
  padding-left: 0.5rem;
  color: var(--color-ink-muted);
  font-size: 0.64rem;
  line-height: 1.4;
}

.editor-actions .primary-button {
  flex: 0 0 auto;
}
</style>
