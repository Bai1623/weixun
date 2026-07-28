import catalog from './cocktails.generated.json'

import type { Cocktail } from '@/types/cocktail'

export type IngredientOption = {
  slug: string
  nameZh: string
  nameEn: string
}

const pantryOnlyIngredients: IngredientOption[] = [
  {
    slug: 'vitamin-c-tablet',
    nameZh: '水溶C',
    nameEn: 'Water soluble vitamin C tablet',
  },
  {
    slug: 'ice',
    nameZh: '冰块',
    nameEn: 'Ice',
  },
  {
    slug: 'water',
    nameZh: '水',
    nameEn: 'Water',
  },
]

export const cocktails = (catalog.items as Cocktail[]).map((cocktail) => ({
  ...cocktail,
  ingredients: cocktail.ingredients.map((item) => ({
    ...item,
    requirement: item.requirement ?? 'required',
  })),
}))

const catalogIngredientOptions: IngredientOption[] = cocktails.flatMap((cocktail) =>
  cocktail.ingredients.map((item) => ({
    slug: item.slug,
    nameZh: item.nameZh,
    nameEn: item.nameEn,
  })),
)

export const allIngredients: IngredientOption[] = Array.from(
  new Map(
    [...catalogIngredientOptions, ...pantryOnlyIngredients].map((item) => [item.slug, item]),
  ).values(),
).sort((a, b) => a.nameZh.localeCompare(b.nameZh, 'zh-Hans-CN'))
