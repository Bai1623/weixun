import { defineStore } from 'pinia'

import { createAnonymousUser } from '@/api/cocktails'
import { getStoredString, setStoredString } from '@/utils/storage'

const createAnonymousKey = (): string => `anon-${crypto.randomUUID()}`

export const useUserStore = defineStore('user', {
  state: () => ({
    anonymousKey: getStoredString('anonymous_user_key', createAnonymousKey()),
    userId: getStoredString('anonymous_user_id', ''),
  }),
  actions: {
    ensureAnonymousKey() {
      setStoredString('anonymous_user_key', this.anonymousKey)
    },
    async ensureRemoteUser(): Promise<string | null> {
      this.ensureAnonymousKey()
      if (this.userId) return this.userId
      try {
        const user = await createAnonymousUser(this.anonymousKey)
        this.userId = user.id
        setStoredString('anonymous_user_id', user.id)
        return user.id
      } catch {
        return null
      }
    },
    resetAnonymousKey() {
      this.anonymousKey = createAnonymousKey()
      this.userId = ''
      this.ensureAnonymousKey()
      setStoredString('anonymous_user_id', '')
    },
  },
})
