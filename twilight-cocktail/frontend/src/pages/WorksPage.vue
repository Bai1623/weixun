<template>
  <div class="space-y-8">
    <SectionHeading
      eyebrow="Works"
      title="我的作品"
      description="记录每天调过的酒、照片、原料和复盘。"
    />

    <section class="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <form
        ref="workFormEl"
        class="rounded-lg border border-gold/15 bg-walnut/70 p-5"
        @submit.prevent="submit"
      >
        <div
          v-if="editingWorkId"
          class="mb-4 flex flex-col gap-3 rounded-lg border border-gold/15 bg-obsidian/45 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p class="text-sm text-cream">正在编辑作品，保存后会覆盖原记录。</p>
          <button
            class="inline-flex items-center justify-center gap-2 rounded-md border border-gold/30 px-3 py-2 text-sm text-gold transition hover:bg-gold/10"
            type="button"
            @click="cancelEdit"
          >
            <X class="h-4 w-4" />
            取消编辑
          </button>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <label class="space-y-2 text-sm text-muted">
            <span>调酒日期</span>
            <input
              ref="dateInput"
              v-model="form.madeAt"
              class="w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream [color-scheme:dark] outline-none focus:ring-2 focus:ring-gold"
              type="date"
              @click="openDatePicker"
              @focus="openDatePicker"
            />
          </label>

          <label class="space-y-2 text-sm text-muted">
            <span>酒单</span>
            <input
              v-model.trim="cocktailSearch"
              class="w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream outline-none focus:ring-2 focus:ring-gold"
              placeholder="搜索酒单"
            />
            <select
              v-model="selectedSlug"
              class="w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream outline-none focus:ring-2 focus:ring-gold"
              @change="applyCocktail"
            >
              <option value="">自由记录</option>
              <option
                v-for="cocktail in cocktailOptions"
                :key="cocktail.value"
                :value="cocktail.value"
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

        <div class="mt-4 space-y-4 rounded-lg border border-gold/10 bg-obsidian/35 p-4">
          <span>原材料</span>
          <div class="space-y-2">
            <div class="flex items-center justify-between gap-3">
              <p class="text-xs text-muted">基酒，可选，最多 4 种</p>
              <p class="text-xs text-gold">{{ selectedBaseLiquorCount }}/4</p>
            </div>
            <div class="grid gap-2 sm:grid-cols-4">
              <select
                v-for="index in 4"
                :key="index"
                v-model="form.ingredientGroups.baseLiquors[index - 1]"
                class="w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream outline-none focus:ring-2 focus:ring-gold"
                :aria-label="`基酒 ${index}`"
              >
                <option value="">无</option>
                <option
                  v-for="option in baseLiquorOptions"
                  :key="option"
                  :value="option"
                  :disabled="isBaseOptionDisabled(option, index - 1)"
                >
                  {{ option }}
                </option>
              </select>
            </div>
          </div>

          <div class="space-y-2">
            <p class="text-xs text-muted">调味酒</p>
            <input
              v-model.trim="flavorLiquorSearch"
              class="w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream outline-none focus:ring-2 focus:ring-gold"
              placeholder="搜索调味酒"
            />
            <select
              v-model="selectedFlavorLiquor"
              class="w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream outline-none focus:ring-2 focus:ring-gold"
              @change="addFlavorLiquor"
            >
              <option value="">选择调味酒</option>
              <option v-for="option in flavorLiquorOptions" :key="option" :value="option">
                {{ option === CUSTOM_OPTION_VALUE ? '自定义添加' : option }}
              </option>
            </select>
            <div v-if="isAddingFlavorLiquor" class="grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                v-model.trim="customFlavorLiquorName"
                class="w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream outline-none focus:ring-2 focus:ring-gold"
                placeholder="输入自定义调味酒"
                @keydown.enter.prevent="saveCustomFlavorLiquor"
              />
              <button
                class="rounded-md border border-gold/30 px-4 py-3 text-sm text-gold transition hover:bg-gold/10"
                type="button"
                @click="saveCustomFlavorLiquor"
              >
                添加
              </button>
            </div>
            <div v-if="form.ingredientGroups.flavorLiquors.length" class="flex flex-wrap gap-2">
              <button
                v-for="item in form.ingredientGroups.flavorLiquors"
                :key="item"
                class="rounded-full bg-cream/10 px-3 py-1 text-xs text-cream transition hover:bg-wine/30"
                type="button"
                @click="removeFlavorLiquor(item)"
              >
                {{ item }} ×
              </button>
            </div>
          </div>

          <div class="space-y-2">
            <p class="text-xs text-muted">饮料类型</p>
            <input
              v-model.trim="beverageSearch"
              class="w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream outline-none focus:ring-2 focus:ring-gold"
              placeholder="搜索饮料"
            />
            <select
              v-model="selectedBeverage"
              class="w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream outline-none focus:ring-2 focus:ring-gold"
              @change="addBeverage"
            >
              <option value="">选择饮料</option>
              <option v-for="option in beverageOptions" :key="option" :value="option">
                {{ option === CUSTOM_OPTION_VALUE ? '自定义添加' : option }}
              </option>
            </select>
            <div v-if="isAddingBeverage" class="grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                v-model.trim="customBeverageName"
                class="w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream outline-none focus:ring-2 focus:ring-gold"
                placeholder="输入自定义饮料"
                @keydown.enter.prevent="saveCustomBeverage"
              />
              <button
                class="rounded-md border border-gold/30 px-4 py-3 text-sm text-gold transition hover:bg-gold/10"
                type="button"
                @click="saveCustomBeverage"
              >
                添加
              </button>
            </div>
            <div v-if="form.ingredientGroups.beverages.length" class="flex flex-wrap gap-2">
              <button
                v-for="item in form.ingredientGroups.beverages"
                :key="item"
                class="rounded-full bg-gold/15 px-3 py-1 text-xs text-cream transition hover:bg-wine/30"
                type="button"
                @click="removeBeverage(item)"
              >
                {{ item }} ×
              </button>
            </div>
          </div>

          <label class="block space-y-2 text-sm text-muted">
            <span>其他</span>
            <textarea
              v-model="form.ingredientGroups.other"
              class="min-h-24 w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream outline-none focus:ring-2 focus:ring-gold"
              placeholder="自由记录，例如：冰块、柠檬片、薄荷叶，或补充具体用量。"
            />
          </label>
        </div>

        <p v-if="formError" class="mt-3 rounded-md bg-wine/20 px-3 py-2 text-sm text-cream">
          {{ formError }}
        </p>

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
          <Save v-if="editingWorkId" class="h-4 w-4" />
          <Plus v-else class="h-4 w-4" />
          {{ editingWorkId ? '保存修改' : '保存作品' }}
        </button>
      </form>

      <div class="space-y-5">
        <div class="rounded-lg border border-gold/15 bg-walnut/70 p-5">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-sm text-muted">作品分享</p>
              <p class="mt-1 text-sm leading-6 text-cream/80">
                用 JSON 备份或发给朋友，导入时会合并新记录。
              </p>
            </div>
            <div class="flex flex-wrap gap-3">
              <button
                class="inline-flex items-center justify-center gap-2 rounded-md border border-gold/30 px-4 py-3 text-sm text-gold transition hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                :disabled="!works.totalCount"
                @click="exportWorks"
              >
                <Download class="h-4 w-4" />
                导出 JSON
              </button>
              <label
                class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-gold px-4 py-3 text-sm font-semibold text-obsidian transition hover:bg-cream"
              >
                <Upload class="h-4 w-4" />
                导入 JSON
                <input
                  class="sr-only"
                  type="file"
                  accept="application/json,.json"
                  @change="importWorks"
                />
              </label>
            </div>
          </div>
          <p
            v-if="shareMessage"
            class="mt-3 rounded-md bg-obsidian/45 px-3 py-2 text-sm text-cream"
          >
            {{ shareMessage }}
          </p>
        </div>

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
                <div class="flex shrink-0 gap-2">
                  <button
                    class="rounded-md border border-gold/30 p-2 text-gold transition hover:bg-gold/10"
                    type="button"
                    :aria-label="`编辑 ${item.cocktailName}`"
                    @click="editWork(item)"
                  >
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button
                    class="rounded-md border border-wine/70 p-2 text-cream transition hover:bg-wine/20"
                    type="button"
                    :aria-label="`删除 ${item.cocktailName}`"
                    @click="works.remove(item.id)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
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
                {{ formatWorkIngredients(item) }}
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
import { Camera, Download, Pencil, Plus, Save, Sparkles, Trash2, Upload, X } from 'lucide-vue-next'

import SectionHeading from '@/components/common/SectionHeading.vue'
import StateBlock from '@/components/common/StateBlock.vue'
import { allIngredients, cocktails } from '@/data/cocktails'
import {
  exportWorkRecords,
  formatWorkIngredients,
  useWorkStore,
  type WorkIngredientGroups,
  type WorkRecord,
  type WorkRecordInput,
} from '@/stores/works'
import {
  CUSTOM_OPTION_VALUE,
  addCustomMaterialOption,
  addCustomWorkCocktailOption,
  getBeverageSelectOptions,
  getCocktailSelectOptions,
  getCustomMaterialOptions,
  getCustomWorkCocktailOptions,
  getFlavorLiquorSelectOptions,
  isFlavorLiquorOption,
} from '@/utils/workFormOptions'

const works = useWorkStore()
const selectedSlug = ref('')
const selectedFlavorLiquor = ref('')
const selectedBeverage = ref('')
const cocktailSearch = ref('')
const flavorLiquorSearch = ref('')
const beverageSearch = ref('')
const customFlavorLiquorName = ref('')
const customBeverageName = ref('')
const customFlavorLiquors = ref(getCustomMaterialOptions('flavorLiquors'))
const customBeverages = ref(getCustomMaterialOptions('beverages'))
const customCocktails = ref(getCustomWorkCocktailOptions())
const isAddingFlavorLiquor = ref(false)
const isAddingBeverage = ref(false)
const formError = ref('')
const shareMessage = ref('')
const editingWorkId = ref<string | null>(null)
const dateInput = ref<HTMLInputElement | null>(null)
const workFormEl = ref<HTMLFormElement | null>(null)
const getToday = () => new Date().toISOString().slice(0, 10)
const createIngredientGroups = (): WorkIngredientGroups => ({
  baseLiquors: ['', '', '', ''],
  flavorLiquors: [],
  beverages: [],
  other: '',
})

type WorkForm = WorkRecordInput & {
  ingredientGroups: WorkIngredientGroups
}

const form = reactive<WorkForm>({
  madeAt: getToday(),
  cocktailSlug: '',
  cocktailName: '',
  photoDataUrl: '',
  ingredientsText: '',
  ingredientGroups: createIngredientGroups(),
  rating: 0,
  mood: '',
  selfReview: '',
  notes: '',
})

const baseLiquorOptions = ['金酒', '朗姆酒', '伏特加', '龙舌兰', '威士忌', '白兰地']
const priorityBeverages = ['柠檬水溶C', '葡萄味气泡水', '橙汁', '东方树叶', '西柚汁']
const extraBeverages = [
  '水溶C',
  '葡萄气泡水',
  '白葡萄汁',
  '白桃气泡水',
  '雪碧',
  '苏打水',
  '汤力水',
  '可乐',
  '绿茶',
  '红茶',
  '乌龙茶',
  '养乐多',
  '菠萝汁',
  '蔓越莓汁',
  '苹果汁',
  '葡萄汁',
  '柠檬汁',
  '青柠汁',
  '姜汁汽水',
  '姜汁啤酒',
  '咖啡',
  '牛奶',
  '椰奶',
]

const getBaseLiquorLabel = (name: string) => {
  if (/金酒|琴酒|Gin/i.test(name)) return '金酒'
  if (/朗姆|Rum/i.test(name)) return '朗姆酒'
  if (/伏特加|Vodka/i.test(name)) return '伏特加'
  if (/龙舌兰|Tequila/i.test(name)) return '龙舌兰'
  if (/威士忌|威士忌|Whisk|Bourbon|Scotch|Rye/i.test(name)) return '威士忌'
  if (/白兰地|Brandy|Cognac/i.test(name)) return '白兰地'
  return ''
}

const beveragePriorityOptions = computed(() => [...priorityBeverages, ...extraBeverages])
const allBeverageNames = computed(() =>
  getBeverageSelectOptions(
    allIngredients,
    beveragePriorityOptions.value,
    '',
    customBeverages.value,
  ).filter((item) => item !== CUSTOM_OPTION_VALUE),
)
const isBeverageName = (name: string) => allBeverageNames.value.includes(name)

const cocktailOptions = computed(() =>
  getCocktailSelectOptions(cocktails, cocktailSearch.value, customCocktails.value),
)
const beverageOptions = computed(() =>
  getBeverageSelectOptions(
    allIngredients,
    beveragePriorityOptions.value,
    beverageSearch.value,
    customBeverages.value,
  ),
)
const flavorLiquorOptions = computed(() =>
  getFlavorLiquorSelectOptions(allIngredients, flavorLiquorSearch.value, customFlavorLiquors.value),
)
const selectedBaseLiquorCount = computed(
  () => form.ingredientGroups.baseLiquors.filter(Boolean).length,
)
const averageRatingText = computed(() => (works.averageRating ? `${works.averageRating}` : '-'))
const latestDateText = computed(() => works.latestItems[0]?.madeAt.slice(5) ?? '-')

const openDatePicker = () => {
  const input = dateInput.value as (HTMLInputElement & { showPicker?: () => void }) | null
  input?.showPicker?.()
}

const isBaseOptionDisabled = (option: string, index: number) =>
  form.ingredientGroups.baseLiquors.some(
    (item, itemIndex) => item === option && itemIndex !== index,
  )

const addUnique = (items: string[], value: string) => {
  const next = value.trim()
  if (next && !items.includes(next)) items.push(next)
}

const removeFrom = (items: string[], value: string) => {
  const index = items.indexOf(value)
  if (index >= 0) items.splice(index, 1)
}

const addFlavorLiquor = () => {
  if (selectedFlavorLiquor.value === CUSTOM_OPTION_VALUE) {
    isAddingFlavorLiquor.value = true
    selectedFlavorLiquor.value = ''
    return
  }
  addUnique(form.ingredientGroups.flavorLiquors, selectedFlavorLiquor.value)
  selectedFlavorLiquor.value = ''
}

const removeFlavorLiquor = (value: string) => {
  removeFrom(form.ingredientGroups.flavorLiquors, value)
}

const addBeverage = () => {
  if (selectedBeverage.value === CUSTOM_OPTION_VALUE) {
    isAddingBeverage.value = true
    selectedBeverage.value = ''
    return
  }
  addUnique(form.ingredientGroups.beverages, selectedBeverage.value)
  selectedBeverage.value = ''
}

const removeBeverage = (value: string) => {
  removeFrom(form.ingredientGroups.beverages, value)
}

const saveCustomFlavorLiquor = () => {
  const name = customFlavorLiquorName.value.trim()
  if (!name) return
  addCustomMaterialOption('flavorLiquors', name)
  customFlavorLiquors.value = getCustomMaterialOptions('flavorLiquors')
  addUnique(form.ingredientGroups.flavorLiquors, name)
  customFlavorLiquorName.value = ''
  isAddingFlavorLiquor.value = false
}

const saveCustomBeverage = () => {
  const name = customBeverageName.value.trim()
  if (!name) return
  addCustomMaterialOption('beverages', name)
  customBeverages.value = getCustomMaterialOptions('beverages')
  addUnique(form.ingredientGroups.beverages, name)
  customBeverageName.value = ''
  isAddingBeverage.value = false
}

const cloneIngredientGroups = (groups: WorkIngredientGroups): WorkIngredientGroups => ({
  baseLiquors: [...groups.baseLiquors],
  flavorLiquors: [...groups.flavorLiquors],
  beverages: [...groups.beverages],
  other: groups.other,
})

const isKnownCocktailName = (name: string) =>
  cocktails.some((item) => item.nameZh === name) ||
  customCocktails.value.some((item) => item.nameZh === name)

const applyCocktail = () => {
  const customCocktail = customCocktails.value.find((item) => item.value === selectedSlug.value)
  if (customCocktail) {
    form.cocktailSlug = customCocktail.value
    form.cocktailName = customCocktail.nameZh
    form.ingredientGroups = customCocktail.ingredientGroups
      ? cloneIngredientGroups(customCocktail.ingredientGroups)
      : createIngredientGroups()
    form.ingredientsText = customCocktail.ingredientsText ?? ''
    return
  }

  const cocktail = cocktails.find((item) => item.slug === selectedSlug.value)
  form.cocktailSlug = cocktail?.slug ?? ''
  if (!cocktail) return
  form.cocktailName = cocktail.nameZh
  const groups = createIngredientGroups()
  const otherItems: string[] = []

  cocktail.ingredients.forEach((item) => {
    const baseLiquor = getBaseLiquorLabel(item.nameZh || item.nameEn)
    if (baseLiquor && !groups.baseLiquors.includes(baseLiquor)) {
      const slot = groups.baseLiquors.findIndex((value) => !value)
      if (slot >= 0) groups.baseLiquors[slot] = baseLiquor
      return
    }

    if (isBeverageName(item.nameZh)) {
      addUnique(groups.beverages, item.nameZh)
      return
    }

    if (isFlavorLiquorOption({ nameZh: item.nameZh, nameEn: item.nameEn })) {
      addUnique(groups.flavorLiquors, item.nameZh)
      return
    }

    otherItems.push(`${item.nameZh}${item.amount ? ` ${item.amount}` : ''}`)
  })

  groups.other = otherItems.join('\n')
  form.ingredientGroups = groups
  form.ingredientsText = formatWorkIngredients({ ingredientsText: '', ingredientGroups: groups })
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

const exportWorks = () => {
  shareMessage.value = ''
  if (!works.totalCount) {
    shareMessage.value = '当前还没有可导出的作品。'
    return
  }

  const blob = new Blob([exportWorkRecords(works.items)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `twilight-mixbook-works-${getToday()}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  shareMessage.value = `已导出 ${works.totalCount} 条作品。`
}

const importWorks = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.addEventListener('load', () => {
    const content = typeof reader.result === 'string' ? reader.result : ''
    const result = works.importFromJson(content)
    shareMessage.value =
      result.importedCount > 0
        ? `已导入 ${result.importedCount} 条作品，跳过 ${result.skippedCount} 条重复或无效记录。`
        : '没有导入新作品，请确认 JSON 文件来自暮调作品导出。'
  })
  reader.addEventListener('error', () => {
    shareMessage.value = '读取 JSON 文件失败，请重新选择文件。'
  })
  reader.readAsText(file)
  input.value = ''
}

const resetForm = () => {
  editingWorkId.value = null
  selectedSlug.value = ''
  selectedFlavorLiquor.value = ''
  selectedBeverage.value = ''
  cocktailSearch.value = ''
  flavorLiquorSearch.value = ''
  beverageSearch.value = ''
  customFlavorLiquorName.value = ''
  customBeverageName.value = ''
  isAddingFlavorLiquor.value = false
  isAddingBeverage.value = false
  formError.value = ''
  Object.assign(form, {
    madeAt: getToday(),
    cocktailSlug: '',
    cocktailName: '',
    photoDataUrl: '',
    ingredientsText: '',
    ingredientGroups: createIngredientGroups(),
    rating: 0,
    mood: '',
    selfReview: '',
    notes: '',
  })
}

const editWork = (item: WorkRecord) => {
  editingWorkId.value = item.id
  selectedSlug.value = item.cocktailSlug
  selectedFlavorLiquor.value = ''
  selectedBeverage.value = ''
  cocktailSearch.value = ''
  flavorLiquorSearch.value = ''
  beverageSearch.value = ''
  customFlavorLiquorName.value = ''
  customBeverageName.value = ''
  isAddingFlavorLiquor.value = false
  isAddingBeverage.value = false
  formError.value = ''
  Object.assign(form, {
    madeAt: item.madeAt,
    cocktailSlug: item.cocktailSlug,
    cocktailName: item.cocktailName,
    photoDataUrl: item.photoDataUrl,
    ingredientsText: item.ingredientsText,
    ingredientGroups: item.ingredientGroups
      ? cloneIngredientGroups(item.ingredientGroups)
      : createIngredientGroups(),
    rating: item.rating,
    mood: item.mood,
    selfReview: item.selfReview,
    notes: item.notes,
  })
  workFormEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const cancelEdit = () => {
  resetForm()
}

const submit = () => {
  formError.value = ''
  if (!form.cocktailName.trim()) {
    formError.value = '请先填写作品名称。'
    return
  }
  if (!form.madeAt) {
    formError.value = '请选择调酒日期。'
    return
  }
  const ingredientsText = formatWorkIngredients({
    ingredientsText: form.ingredientsText,
    ingredientGroups: form.ingredientGroups,
  })
  const cocktailName = form.cocktailName.trim()
  const ingredientGroups = cloneIngredientGroups(form.ingredientGroups)

  const payload: WorkRecordInput = {
    ...form,
    cocktailName,
    ingredientsText,
    mood: form.mood.trim(),
    selfReview: form.selfReview.trim(),
    notes: form.notes.trim(),
  }

  if (editingWorkId.value) {
    const updated = works.update(editingWorkId.value, payload)
    if (!updated) {
      formError.value = '没有找到要编辑的作品，请刷新后重试。'
      return
    }
  } else {
    works.add(payload)
  }

  if (!isKnownCocktailName(cocktailName)) {
    addCustomWorkCocktailOption({
      nameZh: cocktailName,
      ingredientsText,
      ingredientGroups,
    })
    customCocktails.value = getCustomWorkCocktailOptions()
  }

  resetForm()
}
</script>
