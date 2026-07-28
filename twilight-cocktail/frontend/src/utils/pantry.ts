import type { Cocktail, PantryMatches, PantryMatchItem } from '@/types/cocktail'

const substituteIngredientSlugs: Record<string, string[]> = {
  'vitamin-c-tablet': ['lemon-juice', 'lime-juice', 'citrus-juice'],
}

const expandOwnedIngredients = (pantryIngredientSlugs: readonly string[]) =>
  new Set(
    [...pantryIngredientSlugs, 'ice', 'water'].flatMap((slug) => [
      slug,
      ...(substituteIngredientSlugs[slug] ?? []),
    ]),
  )

const toMatchItem = (cocktail: Cocktail, owned: Set<string>): PantryMatchItem => {
  const required = cocktail.ingredients.filter((item) => item.requirement === 'required')
  const optional = cocktail.ingredients.filter((item) => item.requirement !== 'required')
  const matchedRequired = required.filter((item) => owned.has(item.slug))
  const missingRequired = required.filter((item) => !owned.has(item.slug))
  const optionalMissing = optional
    .filter((item) => !owned.has(item.slug))
    .map((item) => item.nameZh)
  const completion = required.length === 0 ? 1 : matchedRequired.length / required.length

  return {
    slug: cocktail.slug,
    nameZh: cocktail.nameZh,
    nameEn: cocktail.nameEn,
    matchedRequired: matchedRequired.length,
    totalRequired: required.length,
    missingIngredients: missingRequired.map((item) => item.nameZh),
    optionalMissing,
    matchScore: Number((completion * 0.8 + cocktail.popularityWeight / 100).toFixed(3)),
  }
}

export const getPantryMatches = (
  cocktails: readonly Cocktail[],
  pantryIngredientSlugs: readonly string[],
): PantryMatches => {
  const owned = expandOwnedIngredients(pantryIngredientSlugs)
  const result: PantryMatches = {
    ready: [],
    missingOne: [],
    partial: [],
  }

  cocktails
    .map((cocktail) => toMatchItem(cocktail, owned))
    .sort((a, b) => b.matchScore - a.matchScore)
    .forEach((item) => {
      const missingCount = item.totalRequired - item.matchedRequired
      if (missingCount === 0) {
        result.ready.push(item)
      } else if (missingCount === 1) {
        result.missingOne.push(item)
      } else {
        result.partial.push(item)
      }
    })

  return result
}
