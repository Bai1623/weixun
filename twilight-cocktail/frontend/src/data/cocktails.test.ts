import { describe, expect, it } from 'vitest'

import { allIngredients, cocktails } from './cocktails'

describe('cocktail catalog data', () => {
  it('includes Chinese social trend cocktail records', () => {
    const names = new Set(cocktails.map((cocktail) => cocktail.nameZh))

    expect(cocktails.length).toBeGreaterThanOrEqual(360)
    expect(names.has('想见你')).toBe(true)
    expect(names.has('冰岛')).toBe(true)
    expect(names.has('占有欲')).toBe(true)
  })

  it('adds convenience-store mixing ingredients to pantry options', () => {
    const ingredientNames = new Set(allIngredients.map((ingredient) => ingredient.nameZh))

    expect(ingredientNames.has('葡萄气泡水')).toBe(true)
    expect(ingredientNames.has('养乐多')).toBe(true)
    expect(ingredientNames.has('果立方')).toBe(true)
    expect(ingredientNames.has('水溶C')).toBe(true)
  })
})
