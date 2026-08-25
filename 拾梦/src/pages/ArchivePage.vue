<template>
  <section class="archive-page">
    <p class="eyebrow">Dream archive</p>
    <h1 class="page-heading">梦的档案</h1>
    <p class="page-intro">按日期、心情与关键词，重新遇见曾经做过的梦。</p>

    <DreamFilters v-model="filters" />

    <div v-if="loadError" class="archive-empty glass-card" role="alert">
      <div>
        <h2>档案暂时没有展开</h2>
        <p>请稍后重新进入此页。</p>
      </div>
    </div>

    <div v-else-if="!store.savedDreams.length" class="archive-empty glass-card">
      <span class="archive-empty__orb" aria-hidden="true" />
      <div>
        <h2>档案还是空的</h2>
        <p>保存的梦会安静地排列在这里。</p>
      </div>
    </div>

    <div v-else-if="!groups.length" class="archive-empty glass-card">
      <span class="archive-empty__orb archive-empty__orb--quiet" aria-hidden="true" />
      <div>
        <h2>没有找到这段梦</h2>
        <p>换一个词或减少筛选条件试试。</p>
      </div>
    </div>

    <div v-else class="month-list">
      <section v-for="group in groups" :key="group.key" data-testid="month-group" class="month-group">
        <header>
          <h2>{{ group.label }}</h2>
          <span>{{ group.dreams.length }} 个梦</span>
        </header>
        <div class="month-group__cards">
          <DreamCard v-for="dream in group.dreams" :key="dream.id" :dream="dream" />
        </div>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import DreamCard from '@/features/dreams/components/DreamCard.vue'
import DreamFilters from '@/features/dreams/components/DreamFilters.vue'
import {
  filterDreams,
  emptyDreamFilters,
  type DreamFiltersValue,
} from '@/features/dreams/search/filterDreams'
import { useDreamsStore } from '@/features/dreams/stores/dreams'

const store = useDreamsStore()
const filters = ref<DreamFiltersValue>({
  ...emptyDreamFilters,
  moods: [],
  clarity: [],
})
const loadError = ref(false)

const filteredDreams = computed(() =>
  filterDreams(store.savedDreams, filters.value).sort(
    (first, second) =>
      second.dreamedAt.localeCompare(first.dreamedAt) || second.createdAt.localeCompare(first.createdAt),
  ),
)

const groups = computed(() => {
  const byMonth = new Map<string, typeof filteredDreams.value>()
  for (const dream of filteredDreams.value) {
    const key = dream.dreamedAt.slice(0, 7)
    const existing = byMonth.get(key) ?? []
    existing.push(dream)
    byMonth.set(key, existing)
  }

  return [...byMonth.entries()].map(([key, dreams]) => {
    const [year, month] = key.split('-')
    return { key, label: `${year}年${Number(month)}月`, dreams }
  })
})

onMounted(async () => {
  try {
    await store.load()
  } catch {
    loadError.value = true
  }
})
</script>

<style scoped>
.archive-empty {
  display: flex;
  align-items: center;
  gap: 1.1rem;
  margin-top: 2rem;
  padding: 1.3rem;
}

.archive-empty__orb {
  width: 3.7rem;
  aspect-ratio: 1;
  flex: 0 0 auto;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, var(--color-moon), var(--color-blush) 52%, #757b98);
  box-shadow: 0 0 2rem rgb(215 169 189 / 42%);
}

.archive-empty__orb--quiet {
  filter: grayscale(0.75);
  opacity: 0.7;
}

.archive-empty h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 400;
}

.archive-empty p {
  margin: 0.4rem 0 0;
  color: var(--color-ink-muted);
  font-size: 0.78rem;
}

.month-list {
  display: grid;
  gap: 2rem;
  margin-top: 1.8rem;
}

.month-group {
  display: grid;
  gap: 0.8rem;
}

.month-group > header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 0 0.25rem;
}

.month-group h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 400;
  letter-spacing: 0.06em;
}

.month-group header span {
  color: var(--color-ink-muted);
  font-size: 0.64rem;
}

.month-group__cards {
  display: grid;
  gap: 0.85rem;
}
</style>
