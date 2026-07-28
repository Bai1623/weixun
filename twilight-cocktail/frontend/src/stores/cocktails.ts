import { defineStore } from 'pinia'

import { fetchCocktail, fetchCocktails, fetchStaticCocktailCatalog } from '@/api/cocktails'
import { cocktails } from '@/data/cocktails'
import type { Cocktail } from '@/types/cocktail'

export const useCocktailStore = defineStore('cocktails', {
  state: () => ({
    items: cocktails,
    loading: false,
    error: '',
    loadedFromApi: false,
  }),
  getters: {
    bySlug: (state) => (slug: string) => state.items.find((cocktail) => cocktail.slug === slug),
  },
  actions: {
    upsert(cocktail: Cocktail) {
      const index = this.items.findIndex((item) => item.slug === cocktail.slug)
      if (index >= 0) {
        this.items[index] = cocktail
      } else {
        this.items = [...this.items, cocktail]
      }
    },
    async fetchAll() {
      this.loading = true
      try {
        const response = await fetchCocktails()
        this.items = response.items
        this.loadedFromApi = true
        this.error = ''
      } catch {
        try {
          const response = await fetchStaticCocktailCatalog()
          this.items = response.items
          this.loadedFromApi = false
          this.error = ''
        } catch {
          this.items = cocktails
          this.loadedFromApi = false
          this.error = 'using-local-data'
        }
      } finally {
        this.loading = false
      }
    },
    async fetchBySlug(slug: string): Promise<Cocktail | undefined> {
      try {
        const cocktail = await fetchCocktail(slug)
        this.upsert(cocktail)
        return cocktail
      } catch {
        return this.bySlug(slug)
      }
    },
  },
})
