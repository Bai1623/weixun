import { defineStore } from 'pinia'

import { getStoredString, setStoredString } from '@/utils/storage'

const createAnonymousKey = (): string => `anon-${crypto.randomUUID()}`

export const useUserStore = defineStore('user', {
  state: () => ({
    anonymousKey: getStoredString('anonymous_user_key', createAnonymousKey()),
  }),
  actions: {
    ensureAnonymousKey() {
      setStoredString('anonymous_user_key', this.anonymousKey)
    },
    resetAnonymousKey() {
      this.anonymousKey = createAnonymousKey()
      this.ensureAnonymousKey()
    },
  },
})
