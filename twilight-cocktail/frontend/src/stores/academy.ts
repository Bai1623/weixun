import { defineStore } from 'pinia'

import { academyLessons } from '@/data/academy'
import { getStoredStringArray, setStoredStringArray } from '@/utils/storage'

export const useAcademyStore = defineStore('academy', {
  state: () => ({
    lessons: academyLessons,
    completedSlugs: getStoredStringArray('academy_progress'),
  }),
  getters: {
    completedCount: (state) => state.completedSlugs.length,
  },
  actions: {
    toggle(slug: string) {
      this.completedSlugs = this.completedSlugs.includes(slug)
        ? this.completedSlugs.filter((item) => item !== slug)
        : [...this.completedSlugs, slug]
      setStoredStringArray('academy_progress', this.completedSlugs)
    },
  },
})
