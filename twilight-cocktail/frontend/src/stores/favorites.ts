import { defineStore } from 'pinia'

import { getStoredStringArray, setStoredStringArray } from '@/utils/storage'

export const useFavoriteStore = defineStore('favorites', {
  state: () => ({
    slugs: getStoredStringArray('favorite_cocktail_slugs'),
  }),
  actions: {
    toggle(slug: string) {
      this.slugs = this.slugs.includes(slug)
        ? this.slugs.filter((item) => item !== slug)
        : [...this.slugs, slug]
      setStoredStringArray('favorite_cocktail_slugs', this.slugs)
    },
    has(slug: string): boolean {
      return this.slugs.includes(slug)
    },
  },
})
