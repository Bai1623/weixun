import type { IDBPDatabase } from 'idb'

import { rethrowStorageWriteError, type ShimengDb } from '@/core/persistence/db'

import type { AppSettings } from '../model/settings'

export interface SettingsRepository {
  get(): Promise<AppSettings | undefined>
  put(settings: AppSettings): Promise<void>
}

export function createSettingsRepository(db: IDBPDatabase<ShimengDb>): SettingsRepository {
  return {
    async get() {
      return db.get('settings', 'app')
    },
    async put(settings) {
      try {
        await db.put('settings', settings, 'app')
      } catch (error) {
        rethrowStorageWriteError(error)
      }
    },
  }
}
