import { describe, expect, it } from 'vitest'

import type { Cocktail } from '@/types/cocktail'
import type { IngredientOption } from '@/data/cocktails'

import {
  getCocktailSelectOptions,
  getFlavorLiquorSelectOptions,
  matchesOptionSearch,
  sortByChineseName,
} from './workFormOptions'

const cocktail = (nameZh: string, slug = nameZh): Cocktail =>
  ({
    slug,
    nameZh,
    nameEn: slug,
    category: 'classic',
    baseSpirit: 'gin',
    difficulty: 'easy',
    timeMinutes: 5,
    method: 'shake',
    glass: 'rocks',
    strength: 'medium',
    flavor: {
      sweet: 1,
      sour: 1,
      bitter: 1,
      herbal: 1,
      fruity: 1,
    },
    ingredients: [],
    steps: [],
    tags: [],
    popularityWeight: 1,
    imageUrl: '',
    story: '',
    sourceName: '',
  }) as Cocktail

const ingredient = (nameZh: string, nameEn = nameZh): IngredientOption => ({
  slug: nameEn.toLowerCase().replace(/\s+/g, '-'),
  nameZh,
  nameEn,
})

describe('work form option helpers', () => {
  it('sorts Chinese display names by pinyin-like locale order', () => {
    expect(sortByChineseName(['想见你', '白桃乌龙', '冰岛']).map((item) => item)).toEqual([
      '白桃乌龙',
      '冰岛',
      '想见你',
    ])
  })

  it('sorts and filters cocktail options for the wine list selector', () => {
    const options = getCocktailSelectOptions(
      [cocktail('想见你'), cocktail('白桃乌龙'), cocktail('冰岛')],
      'bing',
    )

    expect(options.map((item) => item.nameZh)).toEqual(['冰岛'])
  })

  it('keeps real flavor liquors, removes non-liquor ingredients, and pins blue curacao first', () => {
    const options = getFlavorLiquorSelectOptions([
      ingredient('薄荷叶', 'Mint'),
      ingredient('糖浆', 'Syrup'),
      ingredient('蓝橙力娇酒', 'Blue Curacao'),
      ingredient('咖啡利口酒', 'Coffee liqueur'),
      ingredient('味美思', 'Vermouth'),
      ingredient('橙汁', 'Orange juice'),
    ])

    expect(options[0]).toBe('蓝橙力娇酒')
    expect(options).toContain('咖啡利口酒')
    expect(options).toContain('味美思')
    expect(options).not.toContain('薄荷叶')
    expect(options).not.toContain('糖浆')
    expect(options).not.toContain('橙汁')
  })

  it('matches direct Chinese text and lightweight pinyin aliases', () => {
    expect(matchesOptionSearch('蓝橙力娇酒', '蓝橙')).toBe(true)
    expect(matchesOptionSearch('冰岛', 'bing')).toBe(true)
    expect(matchesOptionSearch('想见你', 'xj')).toBe(true)
  })
})
