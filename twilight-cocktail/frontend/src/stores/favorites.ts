import { defineStore } from 'pinia'

import { addFavorite, fetchFavorites, removeFavorite } from '@/api/cocktails'
import { getStoredStringArray, setStoredStringArray } from '@/utils/storage'

export const useFavoriteStore = defineStore('favorites', {
  state: () => ({
    slugs: getStoredStringArray('favorite_cocktail_slugs'),
  }),
  actions: {
    async loadRemote(userId: string | null) {
      if (!userId) return
      try {
        const response = await fetchFavorites(userId)
        this.slugs = response.slugs
        setStoredStringArray('favorite_cocktail_slugs', this.slugs)
      } catch {
        return
      }
    },
    async toggle(slug: string, userId?: string | null) {
      const nextSlugs = this.slugs.includes(slug)
        ? this.slugs.filter((item) => item !== slug)
        : [...this.slugs, slug]
      this.slugs = nextSlugs
      setStoredStringArray('favorite_cocktail_slugs', this.slugs)
      if (!userId) return

      try {
        if (nextSlugs.includes(slug)) {
          const response = await addFavorite(userId, slug)
          this.slugs = response.slugs
        } else {
          await removeFavorite(userId, slug)
        }
        setStoredStringArray('favorite_cocktail_slugs', this.slugs)
      } catch {
        return
      }
    },
    has(slug: string): boolean {
      return this.slugs.includes(slug)
    },
  },
})
