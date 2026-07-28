import { defineStore } from 'pinia'

import { cocktails } from '@/data/cocktails'
import type { Cocktail } from '@/types/cocktail'
import { getTodayKey, selectDailyCocktail } from '@/utils/dailyPick'
import { getStoredString, setStoredString } from '@/utils/storage'

export const useDailyPickStore = defineStore('daily', {
  state: () => ({
    selectedSlug: getStoredString('daily_pick_slug', ''),
    selectedDate: getStoredString('daily_pick_date', ''),
    spinning: false,
  }),
  getters: {
    selected: (state): Cocktail | undefined =>
      cocktails.find((cocktail) => cocktail.slug === state.selectedSlug),
  },
  actions: {
    reveal(userKey: string, date = new Date()): Cocktail {
      const today = getTodayKey(date)
      if (this.selectedSlug && this.selectedDate === today) {
        const existing = cocktails.find((cocktail) => cocktail.slug === this.selectedSlug)
        if (existing) return existing
      }
      const selected = selectDailyCocktail(cocktails, userKey, date)
      this.selectedSlug = selected.slug
      this.selectedDate = today
      setStoredString('daily_pick_slug', selected.slug)
      setStoredString('daily_pick_date', today)
      return selected
    },
  },
})
