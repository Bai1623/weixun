import type { IDBPDatabase } from 'idb'

import { rethrowStorageWriteError, type ShimengDb } from '@/core/persistence/db'

import type { DreamRecord } from '../model/dream'

export interface DreamRepository {
  get(id: string): Promise<DreamRecord | undefined>
  put(record: DreamRecord): Promise<void>
  listSaved(): Promise<DreamRecord[]>
  getDrafts(): Promise<DreamRecord[]>
  deleteWithMedia(id: string): Promise<void>
}

export function createDreamRepository(db: IDBPDatabase<ShimengDb>): DreamRepository {
  return {
    async get(id) {
      return db.get('dreams', id)
    },
    async put(record) {
      try {
        await db.put('dreams', record)
      } catch (error) {
        rethrowStorageWriteError(error)
      }
    },
    async listSaved() {
      const records = await db.getAllFromIndex('dreams', 'by-status', 'saved')
      return records.sort((first, second) => second.dreamedAt.localeCompare(first.dreamedAt))
    },
    async getDrafts() {
      const records = await db.getAllFromIndex('dreams', 'by-status', 'draft')
      return records.sort((first, second) => second.updatedAt.localeCompare(first.updatedAt))
    },
    async deleteWithMedia(id) {
      const transaction = db.transaction(['dreams', 'media'], 'readwrite')
      const mediaStore = transaction.objectStore('media')
      const mediaKeys = await mediaStore.index('by-dreamId').getAllKeys(id)

      await Promise.all([
        transaction.objectStore('dreams').delete(id),
        ...mediaKeys.map((key) => mediaStore.delete(key)),
        transaction.done,
      ])
    },
  }
}
