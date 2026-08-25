import { ref } from 'vue'

import { openShimengDb } from '@/core/persistence/db'

export type PersistenceStatus = 'granted' | 'denied' | 'unsupported'

export interface StorageSummary {
  usedBytes: number
  quotaBytes: number
  dreamCount: number
  audioCount: number
  imageCount: number
}

interface StorageDatabase {
  count(store: 'dreams'): Promise<number>
  getAll(store: 'media'): Promise<Array<{ kind: string }>>
}

export const persistenceStatus = ref<PersistenceStatus | null>(null)

export async function requestPersistentStorage(): Promise<PersistenceStatus> {
  if (!navigator.storage?.persist) {
    persistenceStatus.value = 'unsupported'
    return persistenceStatus.value
  }
  persistenceStatus.value = (await navigator.storage.persist()) ? 'granted' : 'denied'
  return persistenceStatus.value
}

export async function estimateStorage(database?: StorageDatabase): Promise<StorageSummary> {
  const db = database ?? ((await openShimengDb()) as StorageDatabase)
  const [estimate, dreamCount, media] = await Promise.all([
    navigator.storage?.estimate?.() ?? Promise.resolve({}),
    db.count('dreams'),
    db.getAll('media'),
  ])
  return {
    usedBytes: estimate.usage ?? 0,
    quotaBytes: estimate.quota ?? 0,
    dreamCount,
    audioCount: media.filter((asset) => asset.kind === 'audio').length,
    imageCount: media.filter((asset) => asset.kind === 'ai-image').length,
  }
}
