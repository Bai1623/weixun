import type { IngredientOption } from '@/data/cocktails'
import type { Cocktail } from '@/types/cocktail'
import type { WorkIngredientGroups } from '@/stores/works'

export const CUSTOM_OPTION_VALUE = '__custom__'

const customMaterialStorageKeys = {
  flavorLiquors: 'custom_work_flavor_liquors',
  beverages: 'custom_work_beverages',
} as const
const customCocktailStorageKey = 'custom_work_cocktail_options'

export type CustomMaterialKind = keyof typeof customMaterialStorageKeys

export type CustomWorkCocktailOptionInput = {
  nameZh: string
  ingredientsText: string
  ingredientGroups?: WorkIngredientGroups
}

export type WorkCocktailSelectOption = {
  value: string
  slug: string
  nameZh: string
  nameEn: string
  ingredientsText?: string
  ingredientGroups?: WorkIngredientGroups
  isCustom: boolean
}

export type CustomWorkCocktailOption = WorkCocktailSelectOption & {
  createdAt: string
}

const searchAliases: Record<string, string[]> = {
  冰岛: ['bingdao', 'bd', 'bing'],
  想见你: ['xiangjianni', 'xjn', 'xj'],
  占有欲: ['zhanyouyu', 'zyy', 'zy'],
  蓝橙力娇酒: ['lanchenglijiaojiu', 'bluecuracao', 'bluecuracao', 'lc', 'lcljj'],
}

const flavorLiquorPatterns = [
  /利口酒|力娇酒|橙皮酒|咖啡酒|椰子酒|蜜桃酒|黑醋栗酒|樱桃酒/,
  /味美思|苦艾酒|苦精|安格斯图拉|金巴利|阿佩罗|杜本内|夏特勒兹/,
  /Curacao|Curaçao|Liqueur|Triple Sec|Cointreau|Grand Marnier|Campari|Aperol/i,
  /Vermouth|Bitters|Chartreuse|Dubonnet|Chambord|Maraschino|Amaretto|Frangelico/i,
  /Creme de|Crème de|Absinthe|Pastis|Sambuca|Galliano|Midori|Kahlua|Baileys/i,
]

const normalizeSearch = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[\s'’._-]+/g, '')

const optionAliasText = (name: string) => searchAliases[name]?.join(' ') ?? ''

const safeReadStringArray = (key: string): string[] => {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is string => typeof item === 'string')
  } catch {
    return []
  }
}

const writeStringArray = (key: string, values: readonly string[]) => {
  window.localStorage.setItem(key, JSON.stringify(values))
}

const safeReadCustomCocktails = (): CustomWorkCocktailOption[] => {
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(customCocktailStorageKey) ?? '[]',
    )
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is CustomWorkCocktailOption => {
      if (!item || typeof item !== 'object') return false
      const candidate = item as Partial<CustomWorkCocktailOption>
      return (
        typeof candidate.value === 'string' &&
        typeof candidate.slug === 'string' &&
        typeof candidate.nameZh === 'string' &&
        typeof candidate.nameEn === 'string' &&
        typeof candidate.ingredientsText === 'string' &&
        typeof candidate.createdAt === 'string'
      )
    })
  } catch {
    return []
  }
}

const writeCustomCocktails = (records: readonly CustomWorkCocktailOption[]) => {
  window.localStorage.setItem(customCocktailStorageKey, JSON.stringify(records))
}

const slugifyCustomName = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || `custom-${Date.now()}`

export const sortByChineseName = <T extends string>(names: readonly T[]): T[] =>
  [...names].sort((a, b) =>
    a.localeCompare(b, 'zh-Hans-CN-u-co-pinyin', {
      sensitivity: 'base',
      numeric: true,
    }),
  )

export const matchesOptionSearch = (name: string, keyword: string, extraText = '') => {
  const query = normalizeSearch(keyword)
  if (!query) return true

  return normalizeSearch(`${name} ${extraText} ${optionAliasText(name)}`).includes(query)
}

const toCatalogCocktailOption = (cocktail: Cocktail): WorkCocktailSelectOption => ({
  value: cocktail.slug,
  slug: cocktail.slug,
  nameZh: cocktail.nameZh,
  nameEn: cocktail.nameEn,
  isCustom: false,
})

export const getCustomMaterialOptions = (kind: CustomMaterialKind): string[] =>
  sortByChineseName(safeReadStringArray(customMaterialStorageKeys[kind]))

export const addCustomMaterialOption = (kind: CustomMaterialKind, name: string): boolean => {
  const next = name.trim()
  if (!next) return false

  const key = customMaterialStorageKeys[kind]
  const current = safeReadStringArray(key)
  if (current.some((item) => item === next)) return false

  writeStringArray(key, sortByChineseName([...current, next]))
  return true
}

export const getCustomWorkCocktailOptions = (): CustomWorkCocktailOption[] =>
  safeReadCustomCocktails()

export const addCustomWorkCocktailOption = (
  input: CustomWorkCocktailOptionInput,
): CustomWorkCocktailOption | undefined => {
  const nameZh = input.nameZh.trim()
  if (!nameZh) return undefined

  const current = safeReadCustomCocktails()
  const existing = current.find((item) => item.nameZh === nameZh)
  if (existing) {
    const updated: CustomWorkCocktailOption = {
      ...existing,
      ingredientsText: input.ingredientsText.trim(),
      ingredientGroups: input.ingredientGroups,
    }
    writeCustomCocktails(current.map((item) => (item.value === existing.value ? updated : item)))
    return updated
  }

  const record: CustomWorkCocktailOption = {
    value: `custom:${slugifyCustomName(nameZh)}:${Date.now()}`,
    slug: `custom:${slugifyCustomName(nameZh)}`,
    nameZh,
    nameEn: nameZh,
    ingredientsText: input.ingredientsText.trim(),
    ingredientGroups: input.ingredientGroups,
    isCustom: true,
    createdAt: new Date().toISOString(),
  }
  writeCustomCocktails([...current, record])
  return record
}

export const getCocktailSelectOptions = (
  cocktails: readonly Cocktail[],
  keyword = '',
  customCocktails: readonly CustomWorkCocktailOption[] = getCustomWorkCocktailOptions(),
): WorkCocktailSelectOption[] =>
  [...cocktails.map(toCatalogCocktailOption), ...customCocktails]
    .sort((a, b) => (sortByChineseName([a.nameZh, b.nameZh])[0] === a.nameZh ? -1 : 1))
    .filter((cocktail) =>
      matchesOptionSearch(cocktail.nameZh, keyword, `${cocktail.nameEn} ${cocktail.slug}`),
    )

export const isFlavorLiquorOption = (ingredient: Pick<IngredientOption, 'nameZh' | 'nameEn'>) => {
  const nameText = `${ingredient.nameZh} ${ingredient.nameEn}`
  return flavorLiquorPatterns.some((pattern) => pattern.test(nameText))
}

export const getFlavorLiquorSelectOptions = (
  ingredients: readonly IngredientOption[],
  keyword = '',
  customOptions: readonly string[] = getCustomMaterialOptions('flavorLiquors'),
): string[] => {
  const options = Array.from(
    new Set([
      '蓝橙力娇酒',
      ...ingredients.filter(isFlavorLiquorOption).map((ingredient) => ingredient.nameZh),
      ...customOptions,
    ]),
  ).filter((name) => matchesOptionSearch(name, keyword))

  return [
    CUSTOM_OPTION_VALUE,
    '蓝橙力娇酒',
    ...sortByChineseName(options.filter((name) => name !== '蓝橙力娇酒')),
  ]
}

export const getBeverageSelectOptions = (
  ingredients: readonly IngredientOption[],
  priorityBeverages: readonly string[],
  keyword = '',
  customOptions: readonly string[] = getCustomMaterialOptions('beverages'),
): string[] => {
  const beverageKeywords = [
    '汁',
    '水',
    '茶',
    '咖啡',
    '气泡',
    '雪碧',
    '可乐',
    '汤力',
    '苏打',
    '养乐多',
    '牛奶',
    '椰奶',
    '姜汁',
    'Water',
    'Juice',
    'Soda',
    'Tea',
    'Coffee',
    'Cola',
    'Tonic',
    'Milk',
  ]
  const fromIngredients = ingredients
    .map((ingredient) => ingredient.nameZh)
    .filter((name) => beverageKeywords.some((keyword) => name.includes(keyword)))
  const options = Array.from(
    new Set([...priorityBeverages, ...customOptions, ...fromIngredients]),
  ).filter((name) => matchesOptionSearch(name, keyword))

  return [
    CUSTOM_OPTION_VALUE,
    ...priorityBeverages.filter((name) => options.includes(name)),
    ...sortByChineseName(options.filter((name) => !priorityBeverages.includes(name))),
  ]
}
