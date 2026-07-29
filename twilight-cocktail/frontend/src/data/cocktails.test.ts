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

  it('uses recipe-specific steps when source instructions or ingredients are available', () => {
    const missYou = cocktails.find((cocktail) => cocktail.nameZh === '想见你')
    const generated = cocktails.find(
      (cocktail) =>
        cocktail.sourceName.includes('TheCocktailDB API') && cocktail.nameEn === 'Derby',
    )

    expect(missYou?.steps.map((step) => step.instruction).join(' ')).toContain('水溶C')
    expect(missYou?.steps.map((step) => step.instruction).join(' ')).toContain('葡萄气泡水')
    expect(missYou?.steps[0].instruction).not.toContain('准备杯具、冰块和所有材料')

    expect(generated?.steps.length).toBeGreaterThan(3)
    expect(generated?.steps.map((step) => step.instruction).join(' ')).toMatch(/pour|shake|shaker/i)
    expect(generated?.steps[0].instruction).not.toContain('准备杯具、冰块和所有材料')
  })
})
