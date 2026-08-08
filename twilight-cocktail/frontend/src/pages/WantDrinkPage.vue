<template>
  <div class="want-drink-page page-stack mx-auto max-w-5xl">
    <SectionHeading
      eyebrow="Tonight's Order"
      title="我想要喝"
      description="选好想喝的味道，我会按你的点单来调。"
    />

    <StateBlock
      v-if="!shareToken"
      title="这个点单链接无效"
      message="请让分享人重新发送最新的点单链接。"
    />

    <section v-else class="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <form class="ui-panel p-5" @submit.prevent>
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="space-y-2 text-sm text-muted">
            <span>你的称呼</span>
            <input
              v-model.trim="form.guestName"
              class="ui-field px-3 py-3"
              placeholder="你的称呼"
            />
          </label>
          <label class="space-y-2 text-sm text-muted">
            <span>想喝的酒</span>
            <input
              v-model.trim="form.cocktailName"
              class="ui-field px-3 py-3"
              placeholder="例如 冰岛 / 想见你 / 自由特调"
            />
          </label>
        </div>

        <div class="mt-4 space-y-4 rounded-lg border border-gold/10 bg-obsidian/35 p-4">
          <span>想要的原材料</span>
          <div class="space-y-2">
            <div class="flex items-center justify-between gap-3">
              <p class="text-xs text-muted">基酒，可不选，最多 4 种</p>
              <p class="text-xs text-gold">{{ selectedBaseLiquorCount }}/4</p>
            </div>
            <div class="grid gap-2 sm:grid-cols-4">
              <select
                v-for="index in 4"
                :key="index"
                v-model="form.ingredientGroups.baseLiquors[index - 1]"
                class="ui-field px-3 py-3"
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

          <div class="grid gap-4 sm:grid-cols-2">
            <label class="space-y-2 text-sm text-muted">
              <span>调味酒</span>
              <select
                v-model="selectedFlavorLiquor"
                class="ui-field px-3 py-3"
                @change="addFlavorLiquor"
              >
                <option value="">选择调味酒</option>
                <option v-for="option in flavorLiquorOptions" :key="option" :value="option">
                  {{ option }}
                </option>
              </select>
            </label>
            <label class="space-y-2 text-sm text-muted">
              <span>饮料类型</span>
              <select
                v-model="selectedBeverage"
                data-testid="want-beverage-select"
                class="ui-field px-3 py-3"
                @change="addBeverage"
              >
                <option value="">选择饮料</option>
                <option v-for="option in beverageOptions" :key="option" :value="option">
                  {{ option }}
                </option>
              </select>
            </label>
          </div>

          <div
            v-if="
              form.ingredientGroups.flavorLiquors.length || form.ingredientGroups.beverages.length
            "
            class="flex flex-wrap gap-2"
          >
            <button
              v-for="item in form.ingredientGroups.flavorLiquors"
              :key="`flavor-${item}`"
              class="ui-tag px-3 py-1 text-xs transition hover:bg-wine/30"
              type="button"
              @click="removeFlavorLiquor(item)"
            >
              {{ item }} ×
            </button>
            <button
              v-for="item in form.ingredientGroups.beverages"
              :key="`beverage-${item}`"
              class="ui-tag px-3 py-1 text-xs transition hover:bg-wine/30"
              type="button"
              @click="removeBeverage(item)"
            >
              {{ item }} ×
            </button>
          </div>

          <label class="block space-y-2 text-sm text-muted">
            <span>口味和其他材料</span>
            <textarea
              v-model="form.ingredientGroups.other"
              class="ui-field min-h-24 px-3 py-3"
              placeholder="少甜、清爽一点、不要太烈，或补充特殊材料。"
            />
          </label>
          <label class="block space-y-2 text-sm text-muted">
            <span>备注</span>
            <textarea
              v-model="form.note"
              class="ui-field min-h-20 px-3 py-3"
              placeholder="可选：今晚什么时候喝、有没有忌口。"
            />
          </label>
        </div>

        <button
          data-testid="want-drink-submit"
          class="ui-button-primary mt-5 w-full gap-2 disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          :disabled="isSubmitting"
          @click="submit"
        >
          <Send class="h-4 w-4" />
          {{ isSubmitting ? '提交中' : '提交点单' }}
        </button>
        <p
          v-if="message"
          class="mt-4 rounded-md px-3 py-2 text-sm"
          :class="messageKind === 'success' ? 'bg-gold/15 text-cream' : 'bg-wine/20 text-cream'"
        >
          {{ message }}
        </p>
      </form>

      <aside class="ui-panel p-5">
        <p class="text-xs uppercase tracking-[0.2em] text-gold">Twilight Mixbook</p>
        <h2 class="mt-3 font-display text-3xl text-cream">把今晚想喝的味道发给我</h2>
        <p class="mt-4 text-sm leading-7 text-muted">
          这个页面不会上传照片，也不会保存大段内容。每次只提交一条点单，方便我打开“我的作品”查看并按你的原料来调。
        </p>
        <div class="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <div class="ui-stat p-4">
            <p class="text-xs text-muted">酒名</p>
            <p class="mt-1 text-sm text-cream">最多 40 个字</p>
          </div>
          <div class="ui-stat p-4">
            <p class="text-xs text-muted">图片</p>
            <p class="mt-1 text-sm text-cream">不上传</p>
          </div>
          <div class="ui-stat p-4">
            <p class="text-xs text-muted">提交</p>
            <p class="mt-1 text-sm text-cream">一次一条</p>
          </div>
        </div>
      </aside>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Send } from 'lucide-vue-next'

import SectionHeading from '@/components/common/SectionHeading.vue'
import StateBlock from '@/components/common/StateBlock.vue'
import { allIngredients } from '@/data/cocktails'
import { submitDrinkRequest, type DrinkRequestInput } from '@/services/cloudDrinkRequests'
import type { WorkIngredientGroups } from '@/stores/works'
import { getBeverageSelectOptions, getFlavorLiquorSelectOptions } from '@/utils/workFormOptions'

type WantDrinkForm = Required<Pick<DrinkRequestInput, 'guestName' | 'cocktailName' | 'note'>> & {
  ingredientGroups: WorkIngredientGroups
}

const route = useRoute()
const shareToken = computed(() => String(route.params.shareToken ?? '').trim())
const selectedFlavorLiquor = ref('')
const selectedBeverage = ref('')
const isSubmitting = ref(false)
const message = ref('')
const messageKind = ref<'success' | 'error'>('success')

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
  '乌龙茶',
  '养乐多',
  '西柚汁',
]

const createIngredientGroups = (): WorkIngredientGroups => ({
  baseLiquors: ['', '', '', ''],
  flavorLiquors: [],
  beverages: [],
  other: '',
})

const form = reactive<WantDrinkForm>({
  guestName: '',
  cocktailName: '',
  ingredientGroups: createIngredientGroups(),
  note: '',
})

const selectedBaseLiquorCount = computed(
  () => form.ingredientGroups.baseLiquors.filter(Boolean).length,
)
const flavorLiquorOptions = computed(() =>
  getFlavorLiquorSelectOptions(allIngredients, '').filter((item) => item !== '__custom__'),
)
const beverageOptions = computed(() =>
  getBeverageSelectOptions(allIngredients, [...priorityBeverages, ...extraBeverages], '').filter(
    (item) => item !== '__custom__',
  ),
)

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
  addUnique(form.ingredientGroups.flavorLiquors, selectedFlavorLiquor.value)
  selectedFlavorLiquor.value = ''
}

const addBeverage = () => {
  addUnique(form.ingredientGroups.beverages, selectedBeverage.value)
  selectedBeverage.value = ''
}

const removeFlavorLiquor = (value: string) => {
  removeFrom(form.ingredientGroups.flavorLiquors, value)
}

const removeBeverage = (value: string) => {
  removeFrom(form.ingredientGroups.beverages, value)
}

const resetForm = () => {
  Object.assign(form, {
    guestName: '',
    cocktailName: '',
    ingredientGroups: createIngredientGroups(),
    note: '',
  })
}

const submit = async () => {
  message.value = ''
  messageKind.value = 'success'
  isSubmitting.value = true
  try {
    await submitDrinkRequest(shareToken.value, {
      guestName: form.guestName,
      cocktailName: form.cocktailName,
      ingredientGroups: form.ingredientGroups,
      note: form.note,
    })
    resetForm()
    message.value = '已提交，我会在我的作品里看到这条点单。'
  } catch (error) {
    messageKind.value = 'error'
    message.value = error instanceof Error ? error.message : '提交失败，请稍后重试。'
  } finally {
    isSubmitting.value = false
  }
}
</script>
