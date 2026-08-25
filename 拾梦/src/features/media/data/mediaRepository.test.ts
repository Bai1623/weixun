// @vitest-environment node

import { deleteDB, type IDBPDatabase } from 'idb'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { openShimengDb, type ShimengDb } from '@/core/persistence/db'

import type { MediaAsset } from '../model/media'
import { createMediaRepository } from './mediaRepository'

describe('mediaRepository', () => {
  let db: IDBPDatabase<ShimengDb>
  let databaseName: string

  beforeEach(async () => {
    databaseName = `shimeng-media-test-${crypto.randomUUID()}`
    db = await openShimengDb(databaseName)
  })

  afterEach(async () => {
    db.close()
    await deleteDB(databaseName)
  })

  it('stores binary media separately and lists it by owning dream', async () => {
    const repository = createMediaRepository(db)
    const audio: MediaAsset = {
      id: 'audio-1',
      dreamId: 'dream-1',
      kind: 'audio',
      mimeType: 'audio/webm',
      size: 3,
      createdAt: '2026-08-25T00:00:00.000Z',
      blob: new Blob(['abc']),
    }
    const image: MediaAsset = {
      ...audio,
      id: 'image-1',
      kind: 'ai-image',
      mimeType: 'image/png',
    }

    await repository.put(audio)
    await repository.put(image)

    expect(await repository.get(audio.id)).toEqual(audio)
    expect(await repository.listByDream(audio.dreamId)).toEqual([audio, image])

    await repository.delete(audio.id)
    expect(await repository.get(audio.id)).toBeUndefined()
  })

  it('maps quota failures to the shared actionable storage error', async () => {
    const cause = new DOMException('quota reached', 'QuotaExceededError')
    const rejectingDb = {
      put: async () => Promise.reject(cause),
    } as unknown as IDBPDatabase<ShimengDb>
    const repository = createMediaRepository(rejectingDb)

    await expect(
      repository.put({
        id: 'audio-1',
        dreamId: 'dream-1',
        kind: 'audio',
        mimeType: 'audio/webm',
        size: 3,
        createdAt: '2026-08-25T00:00:00.000Z',
        blob: new Blob(['abc']),
      }),
    ).rejects.toMatchObject({
      name: 'StorageWriteError',
      message: '本机存储空间不足，请先导出备份或删除较大的录音',
      cause,
    })
  })
})
