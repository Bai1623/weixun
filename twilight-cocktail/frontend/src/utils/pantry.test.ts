import { describe, expect, it } from 'vitest'

import { allIngredients, cocktails } from '@/data/cocktails'
import { getPantryMatches } from './pantry'

describe('pantry matching', () => {
  it('marks cocktails ready when all required ingredients are owned', () => {
    const matches = getPantryMatches(cocktails, ['gin', 'tonic-water'])

    expect(matches.ready.some((item) => item.slug === 'gin-tonic')).toBe(true)
  })

  it('marks cocktails missing one when exactly one required ingredient is absent', () => {
    const matches = getPantryMatches(cocktails, ['gin'])

    expect(matches.missingOne.some((item) => item.slug === 'gin-tonic')).toBe(true)
  })

  it('does not block readiness when only garnish is missing', () => {
    const garnishOnlyMissingCocktail = {
      ...cocktails[0],
      slug: 'garnish-test',
      ingredients: [
        {
          slug: 'gin',
          nameZh: '金酒',
          nameEn: 'Gin',
          amount: '45 ml',
          requirement: 'required' as const,
          displayOrder: 1,
        },
        {
          slug: 'lime-wedge',
          nameZh: '青柠角',
          nameEn: 'Lime wedge',
          amount: '1 块',
          requirement: 'garnish' as const,
          displayOrder: 2,
        },
      ],
    }
    const matches = getPantryMatches([garnishOnlyMissingCocktail], ['gin'])
    const item = matches.ready.find((match) => match.slug === 'garnish-test')

    expect(item?.optionalMissing).toContain('青柠角')
  })

  it('treats water soluble vitamin C as a citrus acid substitute for matching', () => {
    const matches = getPantryMatches(cocktails, ['white-rum', 'simple-syrup', 'vitamin-c-tablet'])

    expect(matches.ready.some((item) => item.slug === 'daiquiri')).toBe(true)
  })

  it('ships a broad cocktail and ingredient catalog for pantry discovery', () => {
    const ingredientSlugs = allIngredients.map((item) => item.slug)

    expect(cocktails.length).toBeGreaterThanOrEqual(300)
    expect(allIngredients.some((item) => item.slug === 'vitamin-c-tablet')).toBe(true)
    expect(new Set(ingredientSlugs).size).toBe(ingredientSlugs.length)
  })
})
