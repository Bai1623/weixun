import { defineStore } from 'pinia'

import { cocktails } from '@/data/cocktails'
import { getPantryMatches } from '@/utils/pantry'
import { getStoredStringArray, setStoredStringArray } from '@/utils/storage'

export const usePantryStore = defineStore('pantry', {
  state: () => ({
    ingredientSlugs: getStoredStringArray('pantry_ingredient_slugs'),
  }),
  getters: {
    matches: (state) => getPantryMatches(cocktails, state.ingredientSlugs),
  },
  actions: {
    add(slug: string) {
      if (!this.ingredientSlugs.includes(slug)) {
        this.ingredientSlugs = [...this.ingredientSlugs, slug]
        setStoredStringArray('pantry_ingredient_slugs', this.ingredientSlugs)
      }
    },
    remove(slug: string) {
      this.ingredientSlugs = this.ingredientSlugs.filter((item) => item !== slug)
      setStoredStringArray('pantry_ingredient_slugs', this.ingredientSlugs)
    },
  },
})
