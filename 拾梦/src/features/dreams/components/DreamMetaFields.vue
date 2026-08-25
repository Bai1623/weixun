<template>
  <fieldset class="meta-fields">
    <legend>梦的线索</legend>

    <label class="field">
      <span>梦见日期</span>
      <input
        name="dreamedAt"
        type="date"
        :value="modelValue.dreamedAt"
        @input="updateField('dreamedAt', inputValue($event))"
      />
    </label>

    <label class="field">
      <span>醒来时的心情</span>
      <select name="mood" :value="modelValue.mood" @change="updateMood">
        <option v-for="mood in moods" :key="mood.value" :value="mood.value">{{ mood.label }}</option>
      </select>
    </label>

    <label class="field field--wide">
      <span>清晰度 · {{ modelValue.clarity }}</span>
      <input
        name="clarity"
        type="range"
        min="1"
        max="5"
        step="1"
        :value="modelValue.clarity"
        @input="updateClarity"
      />
      <small><i>朦胧</i><i>清晰</i></small>
    </label>

    <label class="field field--wide">
      <span>关键词</span>
      <input
        name="tags"
        type="text"
        :value="modelValue.tags.join('，')"
        placeholder="海水，门，月亮"
        @input="updateTags"
      />
    </label>

    <label class="toggle-field">
      <input
        name="lucid"
        type="checkbox"
        :checked="modelValue.lucid"
        @change="updateChecked('lucid', $event)"
      />
      <span>这是清醒梦</span>
    </label>

    <label class="toggle-field">
      <input
        name="favorite"
        type="checkbox"
        :checked="modelValue.favorite"
        @change="updateChecked('favorite', $event)"
      />
      <span>收藏这个梦</span>
    </label>
  </fieldset>
</template>

<script setup lang="ts">
import type { DreamMood, DreamRecord } from '../model/dream'

const props = defineProps<{ modelValue: DreamRecord }>()
const emit = defineEmits<{ 'update:modelValue': [record: DreamRecord] }>()

const moods: Array<{ value: DreamMood; label: string }> = [
  { value: 'neutral', label: '说不清' },
  { value: 'calm', label: '平静' },
  { value: 'joyful', label: '欣喜' },
  { value: 'mysterious', label: '神秘' },
  { value: 'surreal', label: '超现实' },
  { value: 'sad', label: '难过' },
  { value: 'anxious', label: '焦虑' },
  { value: 'fearful', label: '害怕' },
]

function inputValue(event: Event): string {
  return (event.target as HTMLInputElement).value
}

function updateField<Key extends keyof DreamRecord>(key: Key, value: DreamRecord[Key]) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

function updateMood(event: Event) {
  updateField('mood', inputValue(event) as DreamMood)
}

function updateClarity(event: Event) {
  updateField('clarity', Number(inputValue(event)) as DreamRecord['clarity'])
}

function updateTags(event: Event) {
  const tags = [...new Set(inputValue(event).split(/[,，]/).map((tag) => tag.trim()).filter(Boolean))]
  updateField('tags', tags)
}

function updateChecked(key: 'lucid' | 'favorite', event: Event) {
  updateField(key, (event.target as HTMLInputElement).checked)
}
</script>

<style scoped>
.meta-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin: 0;
  padding: 1.2rem 0 0;
  border: 0;
  border-top: 1px solid var(--color-line);
}

.meta-fields legend {
  padding: 0 0.6rem 0 0;
  color: var(--color-ink-muted);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.12em;
}

.field {
  display: grid;
  min-width: 0;
  gap: 0.45rem;
}

.field--wide {
  grid-column: 1 / -1;
}

.field > span,
.toggle-field > span {
  font-size: 0.76rem;
}

.field input,
.field select {
  width: 100%;
  min-height: 2.8rem;
  padding: 0 0.8rem;
  border: 1px solid var(--color-line);
  border-radius: 0.9rem;
  outline: 0;
  background: rgb(255 255 255 / 38%);
}

.field input[type='range'] {
  min-height: 2rem;
  padding: 0;
  accent-color: var(--color-night-soft);
}

.field small {
  display: flex;
  justify-content: space-between;
  color: var(--color-ink-muted);
  font-size: 0.62rem;
}

.field small i {
  font-style: normal;
}

.toggle-field {
  display: flex;
  min-height: 3rem;
  align-items: center;
  gap: 0.6rem;
}

.toggle-field input {
  width: 1.15rem;
  height: 1.15rem;
  accent-color: var(--color-night-soft);
}
</style>
