import { defineStore } from 'pinia'

export const useAppSettingStore = defineStore('settings', {
  state: () => ({
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  }),
})
