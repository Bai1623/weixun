import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

import type { DreamRecord, DreamStatus } from '@/features/dreams/model/dream'
import type { MediaAsset, MediaKind } from '@/features/media/model/media'
import type { AppSettings } from '@/features/settings/model/settings'

const STORAGE_FULL_MESSAGE = '本机存储空间不足，请先导出备份或删除较大的录音'

export class StorageWriteError extends Error {
  readonly cause: unknown

  constructor(cause: unknown) {
    super(STORAGE_FULL_MESSAGE)
    this.name = 'StorageWriteError'
    this.cause = cause
  }
}

export function rethrowStorageWriteError(error: unknown): never {
  if (typeof error === 'object' && error !== null && 'name' in error && error.name === 'QuotaExceededError') {
    throw new StorageWriteError(error)
  }

  throw error
}

export interface ShimengDb extends DBSchema {
  dreams: {
    key: string
    value: DreamRecord
    indexes: {
      'by-status': DreamStatus
      'by-dreamedAt': string
    }
  }
  media: {
    key: string
    value: MediaAsset
    indexes: {
      'by-dreamId': string
      'by-kind': MediaKind
    }
  }
  settings: {
    key: 'app'
    value: AppSettings
  }
}

export async function openShimengDb(name = 'shimeng'): Promise<IDBPDatabase<ShimengDb>> {
  return openDB<ShimengDb>(name, 1, {
    upgrade(database) {
      const dreams = database.createObjectStore('dreams', { keyPath: 'id' })
      dreams.createIndex('by-status', 'status')
      dreams.createIndex('by-dreamedAt', 'dreamedAt')

      const media = database.createObjectStore('media', { keyPath: 'id' })
      media.createIndex('by-dreamId', 'dreamId')
      media.createIndex('by-kind', 'kind')

      database.createObjectStore('settings')
    },
  })
}
