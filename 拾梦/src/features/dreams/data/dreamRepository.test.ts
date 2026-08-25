import { deleteDB, type IDBPDatabase } from 'idb'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { openShimengDb, type ShimengDb } from '@/core/persistence/db'
import { createMediaRepository } from '@/features/media/data/mediaRepository'

import { createDraftDream } from '../model/dream'
import { createDreamRepository } from './dreamRepository'

describe('dreamRepository', () => {
  let db: IDBPDatabase<ShimengDb>
  let databaseName: string

  beforeEach(async () => {
    databaseName = `shimeng-dream-test-${crypto.randomUUID()}`
    db = await openShimengDb(databaseName)
  })

  afterEach(async () => {
    db.close()
    await deleteDB(databaseName)
  })

  it('creates a stable draft with the accepted privacy-first defaults', () => {
    const draft = createDraftDream('dream-1', new Date('2026-08-25T00:00:00.000Z'))

    expect(draft).toMatchObject({
      id: 'dream-1',
      schemaVersion: 1,
      status: 'draft',
      dreamedAt: '2026-08-25',
      mood: 'neutral',
      clarity: 3,
      lucid: false,
      tags: [],
      favorite: false,
      audioAssetIds: [],
      coverSeed: 'dream-1',
      aiKeywords: [],
    })
  })

  it('round-trips drafts and saved dreams through real IndexedDB indexes', async () => {
    const repository = createDreamRepository(db)
    const saved = {
      ...createDraftDream('saved-1', new Date('2026-08-25T00:00:00.000Z')),
      status: 'saved' as const,
      rawText: '水面尽头有一扇门',
    }
    const draft = createDraftDream('draft-1', new Date('2026-08-24T00:00:00.000Z'))

    await repository.put(saved)
    await repository.put(draft)

    expect(await repository.get(saved.id)).toEqual(saved)
    expect(await repository.listSaved()).toEqual([saved])
    expect(await repository.getDrafts()).toEqual([draft])
  })

  it('deletes a dream and every associated media asset in one operation', async () => {
    const dreams = createDreamRepository(db)
    const media = createMediaRepository(db)
    const dream = {
      ...createDraftDream('dream-1', new Date('2026-08-25T00:00:00.000Z')),
      status: 'saved' as const,
      rawText: '水面尽头有一扇门',
    }

    await dreams.put(dream)
    await media.put({
      id: 'audio-1',
      dreamId: dream.id,
      kind: 'audio',
      mimeType: 'audio/webm',
      size: 3,
      createdAt: dream.createdAt,
      blob: new Blob(['abc']),
    })

    expect(await dreams.get(dream.id)).toEqual(dream)
    expect(await media.listByDream(dream.id)).toHaveLength(1)

    await dreams.deleteWithMedia(dream.id)

    expect(await dreams.get(dream.id)).toBeUndefined()
    expect(await media.listByDream(dream.id)).toEqual([])
  })

  it('reports storage exhaustion without claiming the write succeeded', async () => {
    const cause = new DOMException('quota reached', 'QuotaExceededError')
    const rejectingDb = {
      put: async () => Promise.reject(cause),
    } as unknown as IDBPDatabase<ShimengDb>
    const repository = createDreamRepository(rejectingDb)

    await expect(
      repository.put(createDraftDream('dream-1', new Date('2026-08-25T00:00:00.000Z'))),
    ).rejects.toMatchObject({
      name: 'StorageWriteError',
      message: '本机存储空间不足，请先导出备份或删除较大的录音',
      cause,
    })
  })
})
