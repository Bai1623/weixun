import type { IngredientOption } from '@/data/cocktails'
import type { Cocktail } from '@/types/cocktail'

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

export const getCocktailSelectOptions = (
  cocktails: readonly Cocktail[],
  keyword = '',
): Cocktail[] =>
  [...cocktails]
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
): string[] => {
  const options = Array.from(
    new Set([
      '蓝橙力娇酒',
      ...ingredients.filter(isFlavorLiquorOption).map((ingredient) => ingredient.nameZh),
    ]),
  ).filter((name) => matchesOptionSearch(name, keyword))

  return ['蓝橙力娇酒', ...sortByChineseName(options.filter((name) => name !== '蓝橙力娇酒'))]
}
