import { defineStore } from 'pinia'

import { fetchDailyPick } from '@/api/cocktails'
import { cocktails } from '@/data/cocktails'
import { useCocktailStore } from '@/stores/cocktails'
import type { Cocktail } from '@/types/cocktail'
import { getTodayKey, selectDailyCocktail } from '@/utils/dailyPick'
import { getStoredString, setStoredString } from '@/utils/storage'

export const useDailyPickStore = defineStore('daily', {
  state: () => ({
    selectedSlug: getStoredString('daily_pick_slug', ''),
    selectedDate: getStoredString('daily_pick_date', ''),
    reason: getStoredString('daily_pick_reason', ''),
    spinning: false,
  }),
  getters: {
    selected: (state): Cocktail | undefined => {
      const cocktailStore = useCocktailStore()
      return (
        cocktailStore.bySlug(state.selectedSlug) ??
        cocktails.find((cocktail) => cocktail.slug === state.selectedSlug)
      )
    },
  },
  actions: {
    async reveal(userKey: string, userId?: string | null, date = new Date()): Promise<Cocktail> {
      const today = getTodayKey(date)
      if (this.selectedSlug && this.selectedDate === today) {
        const existing = this.selected
        if (existing) return existing
      }
      if (userId) {
        try {
          const response = await fetchDailyPick(userId, today)
          const cocktailStore = useCocktailStore()
          cocktailStore.upsert(response.cocktail)
          this.selectedSlug = response.cocktail.slug
          this.selectedDate = today
          this.reason = response.reason
          setStoredString('daily_pick_slug', response.cocktail.slug)
          setStoredString('daily_pick_date', today)
          setStoredString('daily_pick_reason', response.reason)
          return response.cocktail
        } catch {
          this.reason = ''
        }
      }
      const cocktailStore = useCocktailStore()
      const pool = cocktailStore.items.length ? cocktailStore.items : cocktails
      const selected = selectDailyCocktail(pool, userKey, date)
      this.selectedSlug = selected.slug
      this.selectedDate = today
      this.reason = '经典热门酒款，制作步骤少，适合作为今日练习。'
      setStoredString('daily_pick_slug', selected.slug)
      setStoredString('daily_pick_date', today)
      setStoredString('daily_pick_reason', this.reason)
      return selected
    },
  },
})
