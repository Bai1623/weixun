<template>
  <div>
    <SectionHeading
      eyebrow="Recipes"
      title="发现酒谱"
      description="从风味、基酒或现有材料开始寻找。"
    />
    <div class="mb-6 grid gap-3 rounded-lg border border-gold/15 bg-walnut/70 p-4 md:grid-cols-4">
      <input
        v-model="keyword"
        class="rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-gold"
        placeholder="搜索中英文酒名"
      />
      <select
        v-model="baseSpirit"
        class="rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-gold"
      >
        <option value="">全部基酒</option>
        <option v-for="spirit in baseSpirits" :key="spirit" :value="spirit">{{ spirit }}</option>
      </select>
      <select
        v-model="difficulty"
        class="rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-gold"
      >
        <option value="">全部难度</option>
        <option value="easy">入门</option>
        <option value="medium">普通</option>
        <option value="advanced">进阶</option>
      </select>
      <select
        v-model="sort"
        class="rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-gold"
      >
        <option value="popular">热门优先</option>
        <option value="beginner">入门优先</option>
        <option value="fewest">材料最少</option>
        <option value="fastest">制作最快</option>
      </select>
    </div>
    <div v-if="filtered.length" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <CocktailCard v-for="cocktail in filtered" :key="cocktail.slug" :cocktail="cocktail" />
    </div>
    <StateBlock
      v-else
      title="没有找到完全符合条件的酒谱"
      message="试试减少筛选条件，或查看只差一种材料的结果。"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import CocktailCard from '@/components/cocktail/CocktailCard.vue'
import SectionHeading from '@/components/common/SectionHeading.vue'
import StateBlock from '@/components/common/StateBlock.vue'
import { useCocktailStore } from '@/stores/cocktails'
import type { DifficultyLevel } from '@/types/cocktail'

const route = useRoute()
const router = useRouter()
const store = useCocktailStore()
const keyword = ref(String(route.query.keyword ?? ''))
const baseSpirit = ref(String(route.query.baseSpirit ?? ''))
const difficulty = ref(String(route.query.difficulty ?? ''))
const sort = ref(String(route.query.sort ?? 'popular'))

const baseSpirits = computed(() =>
  Array.from(new Set(store.items.map((cocktail) => cocktail.baseSpirit))),
)

const filtered = computed(() => {
  const search = keyword.value.trim().toLowerCase()
  const routeIsAlcoholic =
    route.query.isAlcoholic === undefined ? undefined : route.query.isAlcoholic === 'true'
  const items = store.items.filter((cocktail) => {
    const matchesKeyword =
      !search ||
      cocktail.nameZh.includes(search) ||
      cocktail.nameEn.toLowerCase().includes(search) ||
      cocktail.tags.some((tag) => tag.includes(search))
    const matchesSpirit = !baseSpirit.value || cocktail.baseSpirit === baseSpirit.value
    const matchesDifficulty =
      !difficulty.value || cocktail.difficulty === (difficulty.value as DifficultyLevel)
    const matchesAlcohol =
      routeIsAlcoholic === undefined || cocktail.isAlcoholic === routeIsAlcoholic
    return matchesKeyword && matchesSpirit && matchesDifficulty && matchesAlcohol
  })
  return [...items].sort((a, b) => {
    if (sort.value === 'beginner') return Number(b.beginnerFriendly) - Number(a.beginnerFriendly)
    if (sort.value === 'fewest') return a.ingredients.length - b.ingredients.length
    if (sort.value === 'fastest') return a.prepMinutes - b.prepMinutes
    return b.popularityWeight - a.popularityWeight
  })
})

watch([keyword, baseSpirit, difficulty, sort], () => {
  router.replace({
    query: {
      keyword: keyword.value || undefined,
      baseSpirit: baseSpirit.value || undefined,
      difficulty: difficulty.value || undefined,
      sort: sort.value === 'popular' ? undefined : sort.value,
    },
  })
})

onMounted(() => {
  void store.fetchAll()
})
</script>
