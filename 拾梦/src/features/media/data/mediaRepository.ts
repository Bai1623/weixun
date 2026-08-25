import type { IDBPDatabase } from 'idb'

import { rethrowStorageWriteError, type ShimengDb } from '@/core/persistence/db'

import type { MediaAsset } from '../model/media'

export interface MediaRepository {
  get(id: string): Promise<MediaAsset | undefined>
  put(asset: MediaAsset): Promise<void>
  listByDream(dreamId: string): Promise<MediaAsset[]>
  delete(id: string): Promise<void>
}

export function createMediaRepository(db: IDBPDatabase<ShimengDb>): MediaRepository {
  return {
    async get(id) {
      return db.get('media', id)
    },
    async put(asset) {
      try {
        await db.put('media', asset)
      } catch (error) {
        rethrowStorageWriteError(error)
      }
    },
    async listByDream(dreamId) {
      return db.getAllFromIndex('media', 'by-dreamId', dreamId)
    },
    async delete(id) {
      await db.delete('media', id)
    },
  }
}
