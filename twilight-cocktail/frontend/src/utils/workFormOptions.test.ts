import { beforeEach, describe, expect, it } from 'vitest'

import type { Cocktail } from '@/types/cocktail'
import type { IngredientOption } from '@/data/cocktails'

import {
  CUSTOM_OPTION_VALUE,
  addCustomMaterialOption,
  addCustomWorkCocktailOption,
  getCocktailSelectOptions,
  getCustomMaterialOptions,
  getCustomWorkCocktailOptions,
  getBeverageSelectOptions,
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
  beforeEach(() => {
    window.localStorage.clear()
  })

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

  it('includes saved custom cocktail options in the wine list selector', () => {
    addCustomWorkCocktailOption({
      nameZh: '我的荔枝特调',
      ingredientsText: '基酒：金酒\n饮料：荔枝气泡水',
      ingredientGroups: {
        baseLiquors: ['金酒'],
        flavorLiquors: [],
        beverages: ['荔枝气泡水'],
        other: '',
      },
    })

    const restored = getCustomWorkCocktailOptions()
    const options = getCocktailSelectOptions([cocktail('冰岛')], '荔枝', restored)

    expect(restored).toHaveLength(1)
    expect(options.map((item) => item.nameZh)).toEqual(['我的荔枝特调'])
    expect(options[0].value).toContain('custom:')
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

    expect(options[0]).toBe(CUSTOM_OPTION_VALUE)
    expect(options[1]).toBe('蓝橙力娇酒')
    expect(options).toContain('咖啡利口酒')
    expect(options).toContain('味美思')
    expect(options).not.toContain('薄荷叶')
    expect(options).not.toContain('糖浆')
    expect(options).not.toContain('橙汁')
  })

  it('adds custom material options and keeps them after reload', () => {
    expect(addCustomMaterialOption('flavorLiquors', '紫苏梅酒')).toBe(true)
    expect(addCustomMaterialOption('beverages', '荔枝气泡水')).toBe(true)
    expect(addCustomMaterialOption('beverages', '荔枝气泡水')).toBe(false)

    expect(getCustomMaterialOptions('flavorLiquors')).toEqual(['紫苏梅酒'])
    expect(
      getFlavorLiquorSelectOptions([], '', getCustomMaterialOptions('flavorLiquors')),
    ).toContain('紫苏梅酒')
    expect(
      getBeverageSelectOptions([], ['橙汁'], '荔枝', getCustomMaterialOptions('beverages')),
    ).toEqual([CUSTOM_OPTION_VALUE, '荔枝气泡水'])
  })

  it('places the custom add option at the top of flavor and beverage selectors', () => {
    expect(getFlavorLiquorSelectOptions([])[0]).toBe(CUSTOM_OPTION_VALUE)
    expect(getBeverageSelectOptions([], ['橙汁'])[0]).toBe(CUSTOM_OPTION_VALUE)
  })

  it('matches direct Chinese text and lightweight pinyin aliases', () => {
    expect(matchesOptionSearch('蓝橙力娇酒', '蓝橙')).toBe(true)
    expect(matchesOptionSearch('冰岛', 'bing')).toBe(true)
    expect(matchesOptionSearch('想见你', 'xj')).toBe(true)
  })
})
