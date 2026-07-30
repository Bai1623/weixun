<template>
  <div class="space-y-8">
    <SectionHeading
      eyebrow="Works"
      title="我的作品"
      description="记录每天调过的酒、照片、原料和复盘。"
    />

    <section class="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <form class="rounded-lg border border-gold/15 bg-walnut/70 p-5" @submit.prevent="submit">
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="space-y-2 text-sm text-muted">
            <span>调酒日期</span>
            <input
              v-model="form.madeAt"
              class="w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream outline-none focus:ring-2 focus:ring-gold"
              type="date"
            />
          </label>

          <label class="space-y-2 text-sm text-muted">
            <span>关联酒款</span>
            <select
              v-model="selectedSlug"
              class="w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream outline-none focus:ring-2 focus:ring-gold"
              @change="applyCocktail"
            >
              <option value="">自由记录</option>
              <option
                v-for="cocktail in cocktailOptions"
                :key="cocktail.slug"
                :value="cocktail.slug"
              >
                {{ cocktail.nameZh }}
              </option>
            </select>
          </label>
        </div>

        <label class="mt-4 block space-y-2 text-sm text-muted">
          <span>作品名称</span>
          <input
            v-model.trim="form.cocktailName"
            class="w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream outline-none focus:ring-2 focus:ring-gold"
            placeholder="例如 想见你 / 白桃乌龙 / 自由特调"
          />
        </label>

        <label class="mt-4 block space-y-2 text-sm text-muted">
          <span>原材料</span>
          <textarea
            v-model="form.ingredientsText"
            class="min-h-28 w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream outline-none focus:ring-2 focus:ring-gold"
            placeholder="每行写一种材料，例如：伏特加 30 ml"
          />
        </label>

        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <label class="space-y-2 text-sm text-muted">
            <span>自我评价</span>
            <select
              v-model.number="form.rating"
              class="w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream outline-none focus:ring-2 focus:ring-gold"
            >
              <option :value="0">未评分</option>
              <option v-for="score in [5, 4, 3, 2, 1]" :key="score" :value="score">
                {{ score }} 星
              </option>
            </select>
          </label>

          <label class="space-y-2 text-sm text-muted">
            <span>口感关键词</span>
            <input
              v-model.trim="form.mood"
              class="w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream outline-none focus:ring-2 focus:ring-gold"
              placeholder="清爽 / 酸甜 / 酒感强"
            />
          </label>
        </div>

        <label class="mt-4 block space-y-2 text-sm text-muted">
          <span>复盘</span>
          <textarea
            v-model="form.selfReview"
            class="min-h-24 w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream outline-none focus:ring-2 focus:ring-gold"
            placeholder="这杯哪里好喝，下次要调整什么。"
          />
        </label>

        <label class="mt-4 block space-y-2 text-sm text-muted">
          <span>备注</span>
          <textarea
            v-model="form.notes"
            class="min-h-20 w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream outline-none focus:ring-2 focus:ring-gold"
            placeholder="场景、朋友反馈、杯型或装饰。"
          />
        </label>

        <div class="mt-5 grid gap-4 sm:grid-cols-[10rem_1fr]">
          <div
            class="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-gold/15 bg-obsidian/70"
          >
            <img
              v-if="form.photoDataUrl"
              :src="form.photoDataUrl"
              alt="作品照片"
              class="h-full w-full object-cover"
            />
            <Camera v-else class="h-8 w-8 text-gold/70" />
          </div>
          <div class="flex flex-col justify-between gap-3">
            <label
              class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-gold/30 px-4 py-3 text-sm text-gold transition hover:bg-gold/10"
            >
              <Camera class="h-4 w-4" />
              选择照片
              <input class="sr-only" type="file" accept="image/*" @change="readPhoto" />
            </label>
            <button
              v-if="form.photoDataUrl"
              class="rounded-md border border-wine/70 px-4 py-3 text-sm text-cream"
              type="button"
              @click="form.photoDataUrl = ''"
            >
              移除照片
            </button>
          </div>
        </div>

        <button
          class="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-gold px-5 py-3 font-semibold text-obsidian transition hover:bg-cream"
          type="submit"
        >
          <Plus class="h-4 w-4" />
          保存作品
        </button>
      </form>

      <div class="space-y-5">
        <div class="grid gap-4 sm:grid-cols-3">
          <div class="rounded-lg border border-gold/15 bg-walnut/70 p-5">
            <p class="text-sm text-muted">作品数</p>
            <p class="mt-2 font-display text-3xl">{{ works.totalCount }}</p>
          </div>
          <div class="rounded-lg border border-gold/15 bg-walnut/70 p-5">
            <p class="text-sm text-muted">平均评分</p>
            <p class="mt-2 font-display text-3xl">{{ averageRatingText }}</p>
          </div>
          <div class="rounded-lg border border-gold/15 bg-walnut/70 p-5">
            <p class="text-sm text-muted">最近一次</p>
            <p class="mt-2 font-display text-3xl">{{ latestDateText }}</p>
          </div>
        </div>

        <div v-if="works.latestItems.length" class="space-y-4">
          <article
            v-for="item in works.latestItems"
            :key="item.id"
            class="grid gap-4 rounded-lg border border-gold/15 bg-walnut/70 p-4 sm:grid-cols-[8rem_1fr]"
          >
            <div
              class="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-obsidian/70"
            >
              <img
                v-if="item.photoDataUrl"
                :src="item.photoDataUrl"
                :alt="item.cocktailName"
                class="h-full w-full object-cover"
              />
              <Sparkles v-else class="h-7 w-7 text-gold/70" />
            </div>
            <div class="min-w-0">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-xs uppercase tracking-[0.18em] text-gold">{{ item.madeAt }}</p>
                  <h2 class="mt-1 font-display text-2xl text-cream">{{ item.cocktailName }}</h2>
                </div>
                <button
                  class="rounded-md border border-wine/70 p-2 text-cream transition hover:bg-wine/20"
                  type="button"
                  :aria-label="`删除 ${item.cocktailName}`"
                  @click="works.remove(item.id)"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>

              <div class="mt-3 flex flex-wrap gap-2 text-xs">
                <span v-if="item.rating" class="rounded-md bg-gold px-2 py-1 text-obsidian">
                  {{ item.rating }} 星
                </span>
                <span v-if="item.mood" class="rounded-md bg-cream/10 px-2 py-1 text-cream">
                  {{ item.mood }}
                </span>
              </div>

              <p class="mt-3 whitespace-pre-line text-sm leading-6 text-muted">
                {{ item.ingredientsText }}
              </p>
              <p v-if="item.selfReview" class="mt-3 text-sm leading-6 text-cream">
                {{ item.selfReview }}
              </p>
              <p v-if="item.notes" class="mt-2 text-xs leading-5 text-muted">{{ item.notes }}</p>
            </div>
          </article>
        </div>

        <StateBlock
          v-else
          title="还没有作品"
          message="保存第一杯，今晚的味道就不会只留在记忆里。"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Camera, Plus, Sparkles, Trash2 } from 'lucide-vue-next'

import SectionHeading from '@/components/common/SectionHeading.vue'
import StateBlock from '@/components/common/StateBlock.vue'
import { cocktails } from '@/data/cocktails'
import { useWorkStore, type WorkRecordInput } from '@/stores/works'

const works = useWorkStore()
const selectedSlug = ref('')
const today = new Date().toISOString().slice(0, 10)
const form = reactive<WorkRecordInput>({
  madeAt: today,
  cocktailSlug: '',
  cocktailName: '',
  photoDataUrl: '',
  ingredientsText: '',
  rating: 0,
  mood: '',
  selfReview: '',
  notes: '',
})

const cocktailOptions = computed(() =>
  [...cocktails].sort((a, b) => b.popularityWeight - a.popularityWeight),
)
const averageRatingText = computed(() => (works.averageRating ? `${works.averageRating}` : '-'))
const latestDateText = computed(() => works.latestItems[0]?.madeAt.slice(5) ?? '-')

const applyCocktail = () => {
  const cocktail = cocktails.find((item) => item.slug === selectedSlug.value)
  form.cocktailSlug = cocktail?.slug ?? ''
  if (!cocktail) return
  form.cocktailName = cocktail.nameZh
  form.ingredientsText = cocktail.ingredients
    .map((item) => `${item.nameZh}${item.amount ? ` ${item.amount}` : ''}`)
    .join('\n')
}

const readPhoto = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.addEventListener('load', () => {
    form.photoDataUrl = typeof reader.result === 'string' ? reader.result : ''
  })
  reader.readAsDataURL(file)
  input.value = ''
}

const resetForm = () => {
  selectedSlug.value = ''
  Object.assign(form, {
    madeAt: today,
    cocktailSlug: '',
    cocktailName: '',
    photoDataUrl: '',
    ingredientsText: '',
    rating: 0,
    mood: '',
    selfReview: '',
    notes: '',
  })
}

const submit = () => {
  if (!form.cocktailName.trim()) return
  works.add({
    ...form,
    cocktailName: form.cocktailName.trim(),
    ingredientsText: form.ingredientsText.trim(),
    mood: form.mood.trim(),
    selfReview: form.selfReview.trim(),
    notes: form.notes.trim(),
  })
  resetForm()
}
</script>
