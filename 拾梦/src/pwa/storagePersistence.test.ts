import { afterEach, describe, expect, it, vi } from 'vitest'

import { estimateStorage, requestPersistentStorage } from './storagePersistence'

describe('storage persistence', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('reports whether the browser granted persistent local storage', async () => {
    vi.stubGlobal('navigator', {
      storage: { persist: vi.fn(async () => true) },
    })

    await expect(requestPersistentStorage()).resolves.toBe('granted')
  })

  it('combines browser quota with local dream and media counts', async () => {
    vi.stubGlobal('navigator', {
      storage: { estimate: vi.fn(async () => ({ usage: 2048, quota: 8192 })) },
    })
    const database = {
      count: vi.fn(async (store: string) => (store === 'dreams' ? 3 : 0)),
      getAll: vi.fn(async () => [
        { kind: 'audio' },
        { kind: 'audio' },
        { kind: 'ai-image' },
      ]),
    }

    await expect(estimateStorage(database)).resolves.toEqual({
      usedBytes: 2048,
      quotaBytes: 8192,
      dreamCount: 3,
      audioCount: 2,
      imageCount: 1,
    })
  })
})
