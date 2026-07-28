import { defineStore } from 'pinia'

import { cocktails } from '@/data/cocktails'

export const useCocktailStore = defineStore('cocktails', {
  state: () => ({
    items: cocktails,
    loading: false,
    error: '',
  }),
  getters: {
    bySlug: (state) => (slug: string) => state.items.find((cocktail) => cocktail.slug === slug),
  },
})
