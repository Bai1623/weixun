<template>
  <div class="space-y-8">
    <SectionHeading
      eyebrow="Pantry"
      title="我的酒柜"
      description="登记家中已有材料，快速判断今晚可以直接制作哪些酒。"
    />
    <section class="rounded-lg border border-gold/15 bg-walnut/70 p-5">
      <input
        v-model="search"
        class="w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-gold"
        placeholder="搜索原料，例如 金酒 / 青柠 / 汤力水"
      />
      <div class="mt-4 flex flex-wrap gap-2">
        <button
          v-for="item in filteredIngredients.slice(0, 18)"
          :key="item.slug"
          class="rounded-md border border-gold/20 px-3 py-2 text-sm transition hover:bg-gold/10"
          type="button"
          @click="pantry.add(item.slug)"
        >
          {{ item.nameZh }}
        </button>
      </div>
    </section>

    <section>
      <SectionHeading title="已拥有材料" />
      <div v-if="ownedIngredients.length" class="flex flex-wrap gap-2">
        <button
          v-for="item in ownedIngredients"
          :key="item.slug"
          class="rounded-md bg-gold px-3 py-2 text-sm text-obsidian"
          type="button"
          @click="pantry.remove(item.slug)"
        >
          {{ item.nameZh }} ×
        </button>
      </div>
      <StateBlock
        v-else
        title="酒柜还是空的"
        message="先添加几种常用材料，例如金酒、汤力水、青柠汁或糖浆。"
      />
    </section>

    <section class="grid gap-5 lg:grid-cols-2">
      <div class="rounded-lg border border-gold/15 bg-walnut/70 p-5">
        <h2 class="font-display text-2xl">可以直接制作</h2>
        <div class="mt-4 space-y-3">
          <RouterLink
            v-for="item in pantry.matches.ready"
            :key="item.slug"
            class="block rounded-md bg-cream/5 p-3 text-sm"
            :to="`/cocktails/${item.slug}`"
          >
            {{ item.nameZh }} · {{ item.matchedRequired }}/{{ item.totalRequired }}
          </RouterLink>
          <p v-if="!pantry.matches.ready.length" class="text-sm text-muted">
            暂时没有完全匹配的酒款。
          </p>
        </div>
      </div>
      <div class="rounded-lg border border-gold/15 bg-walnut/70 p-5">
        <h2 class="font-display text-2xl">只差一种</h2>
        <div class="mt-4 space-y-3">
          <RouterLink
            v-for="item in pantry.matches.missingOne"
            :key="item.slug"
            class="block rounded-md bg-cream/5 p-3 text-sm"
            :to="`/cocktails/${item.slug}`"
          >
            {{ item.nameZh }} · 缺 {{ item.missingIngredients.join('、') }}
          </RouterLink>
          <p v-if="!pantry.matches.missingOne.length" class="text-sm text-muted">
            添加更多材料后会出现接近完成的酒款。
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'

import SectionHeading from '@/components/common/SectionHeading.vue'
import StateBlock from '@/components/common/StateBlock.vue'
import { allIngredients } from '@/data/cocktails'
import { usePantryStore } from '@/stores/pantry'

const pantry = usePantryStore()
const search = ref('')
const filteredIngredients = computed(() =>
  allIngredients.filter(
    (item) =>
      !search.value ||
      item.nameZh.includes(search.value) ||
      item.nameEn.toLowerCase().includes(search.value.toLowerCase()),
  ),
)
const ownedIngredients = computed(() =>
  allIngredients.filter((item) => pantry.ingredientSlugs.includes(item.slug)),
)
</script>
