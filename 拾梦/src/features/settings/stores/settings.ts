import { defineStore } from 'pinia'

import { openShimengDb } from '@/core/persistence/db'
import { applyMotionPreference } from '@/pwa/motionPreference'
import { createSettingsRepository, type SettingsRepository } from '../data/settingsRepository'
import { defaultAppSettings, type AppSettings } from '../model/settings'

let repositoryPromise: Promise<SettingsRepository> | undefined

function getSettingsRepository() {
  repositoryPromise ??= openShimengDb().then(createSettingsRepository)
  return repositoryPromise
}

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    settings: { ...defaultAppSettings } as AppSettings,
    loaded: false,
  }),
  actions: {
    async load() {
      const repository = await getSettingsRepository()
      this.settings = (await repository.get()) ?? { ...defaultAppSettings }
      applyMotionPreference(this.settings.reducedMotionOverride)
      this.loaded = true
      return this.settings
    },
    async update(patch: Partial<Omit<AppSettings, 'schemaVersion'>>) {
      const updated: AppSettings = { ...this.settings, ...patch, schemaVersion: 1 }
      await (await getSettingsRepository()).put(updated)
      this.settings = updated
      applyMotionPreference(updated.reducedMotionOverride)
      return updated
    },
  },
})
