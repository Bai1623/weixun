import { beforeEach, describe, expect, it } from 'vitest'

import { getStoredStringArray, setStoredStringArray } from './storage'

describe('storage helpers', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('round-trips string arrays', () => {
    setStoredStringArray('favorite_cocktail_slugs', ['negroni', 'mojito'])

    expect(getStoredStringArray('favorite_cocktail_slugs')).toEqual(['negroni', 'mojito'])
  })

  it('returns an empty array when storage contains invalid JSON', () => {
    window.localStorage.setItem('pantry_ingredient_slugs', '{not json')

    expect(getStoredStringArray('pantry_ingredient_slugs')).toEqual([])
  })
})
