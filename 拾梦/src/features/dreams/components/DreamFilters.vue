<template>
  <section class="dream-filters glass-card" aria-label="筛选梦境">
    <label class="search-field">
      <Search :size="18" aria-hidden="true" />
      <span class="sr-only">搜索梦境</span>
      <input
        name="query"
        type="search"
        :value="modelValue.query"
        placeholder="搜索标题、原文或关键词"
        @input="update({ query: ($event.target as HTMLInputElement).value })"
      />
    </label>

    <details>
      <summary>更多筛选 <span>{{ activeFilterCount ? `已选 ${activeFilterCount}` : '情绪 · 清晰度 · 收藏' }}</span></summary>

      <div class="filter-section">
        <h3>情绪</h3>
        <div class="chip-row">
          <label v-for="mood in moods" :key="mood.value" class="filter-chip">
            <input
              type="checkbox"
              :checked="modelValue.moods.includes(mood.value)"
              @change="toggleMood(mood.value)"
            />
            <span>{{ mood.label }}</span>
          </label>
        </div>
      </div>

      <div class="filter-section">
        <h3>清晰度</h3>
        <div class="chip-row">
          <label v-for="clarity in clarityValues" :key="clarity" class="filter-chip">
            <input
              type="checkbox"
              :checked="modelValue.clarity.includes(clarity)"
              @change="toggleClarity(clarity)"
            />
            <span>{{ clarity }}</span>
          </label>
        </div>
      </div>

      <div class="toggle-row">
        <label>
          <input
            type="checkbox"
            :checked="modelValue.lucidOnly"
            @change="update({ lucidOnly: ($event.target as HTMLInputElement).checked })"
          />
          只看清醒梦
        </label>
        <label>
          <input
            type="checkbox"
            :checked="modelValue.favoriteOnly"
            @change="update({ favoriteOnly: ($event.target as HTMLInputElement).checked })"
          />
          只看收藏
        </label>
      </div>
    </details>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Search } from '@lucide/vue'

import type { DreamClarity, DreamMood } from '../model/dream'
import type { DreamFiltersValue } from '../search/filterDreams'

const props = defineProps<{ modelValue: DreamFiltersValue }>()
const emit = defineEmits<{ 'update:modelValue': [value: DreamFiltersValue] }>()

const moods: Array<{ value: DreamMood; label: string }> = [
  { value: 'calm', label: '平静' },
  { value: 'joyful', label: '欣喜' },
  { value: 'mysterious', label: '神秘' },
  { value: 'surreal', label: '超现实' },
  { value: 'sad', label: '难过' },
  { value: 'anxious', label: '焦虑' },
  { value: 'fearful', label: '害怕' },
  { value: 'neutral', label: '说不清' },
]
const clarityValues: DreamClarity[] = [1, 2, 3, 4, 5]
const activeFilterCount = computed(
  () =>
    props.modelValue.moods.length +
    props.modelValue.clarity.length +
    Number(props.modelValue.lucidOnly) +
    Number(props.modelValue.favoriteOnly),
)

function update(patch: Partial<DreamFiltersValue>) {
  emit('update:modelValue', {
    ...props.modelValue,
    moods: [...props.modelValue.moods],
    clarity: [...props.modelValue.clarity],
    ...patch,
  })
}

function toggleMood(mood: DreamMood) {
  const moods = props.modelValue.moods.includes(mood)
    ? props.modelValue.moods.filter((value) => value !== mood)
    : [...props.modelValue.moods, mood]
  update({ moods })
}

function toggleClarity(clarity: DreamClarity) {
  const values = props.modelValue.clarity.includes(clarity)
    ? props.modelValue.clarity.filter((value) => value !== clarity)
    : [...props.modelValue.clarity, clarity]
  update({ clarity: values })
}
</script>

<style scoped>
.dream-filters {
  display: grid;
  gap: 0.7rem;
  margin-top: 1.5rem;
  padding: 0.8rem;
  border-radius: 1.3rem;
}

.search-field {
  display: flex;
  min-height: 3rem;
  align-items: center;
  gap: 0.55rem;
  padding: 0 0.7rem;
  border-radius: 0.9rem;
  background: rgb(255 255 255 / 38%);
}

.search-field input {
  width: 100%;
  min-width: 0;
  min-height: 2.8rem;
  border: 0;
  outline: 0;
  background: transparent;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

details {
  padding: 0 0.2rem;
}

summary {
  display: flex;
  min-height: 2.6rem;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  font-size: 0.72rem;
  list-style: none;
}

summary span {
  color: var(--color-ink-muted);
  font-size: 0.62rem;
}

.filter-section {
  padding: 0.7rem 0;
  border-top: 1px solid var(--color-line);
}

.filter-section h3 {
  margin: 0 0 0.55rem;
  color: var(--color-ink-muted);
  font-size: 0.65rem;
  font-weight: 500;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.filter-chip input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.filter-chip span {
  display: inline-flex;
  min-height: 2rem;
  align-items: center;
  padding: 0.35rem 0.65rem;
  border: 1px solid var(--color-line);
  border-radius: 999px;
  color: var(--color-ink-muted);
  font-size: 0.65rem;
}

.filter-chip input:checked + span {
  color: white;
  background: var(--color-night-soft);
}

.toggle-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 0.75rem 0 0.2rem;
  border-top: 1px solid var(--color-line);
}

.toggle-row label {
  display: flex;
  min-height: 2.5rem;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.68rem;
}

.toggle-row input {
  width: 1rem;
  height: 1rem;
  accent-color: var(--color-night-soft);
}
</style>
