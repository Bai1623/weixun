// @vitest-environment node

import { deleteDB, type IDBPDatabase } from 'idb'
import { strToU8, zipSync } from 'fflate'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { openShimengDb, type ShimengDb } from '@/core/persistence/db'
import { createDreamRepository } from '@/features/dreams/data/dreamRepository'
import { createDraftDream } from '@/features/dreams/model/dream'
import { createMediaRepository } from '@/features/media/data/mediaRepository'

import { createBackup, inspectBackup, restoreBackup } from './backupService'

function blobFromZip(entries: Record<string, Uint8Array>): Blob {
  return new Blob([zipSync(entries)])
}

describe('backupService', () => {
  let source: IDBPDatabase<ShimengDb>
  let target: IDBPDatabase<ShimengDb>
  let sourceName: string
  let targetName: string

  beforeEach(async () => {
    sourceName = `shimeng-backup-source-${crypto.randomUUID()}`
    targetName = `shimeng-backup-target-${crypto.randomUUID()}`
    source = await openShimengDb(sourceName)
    target = await openShimengDb(targetName)
  })

  afterEach(async () => {
    source.close()
    target.close()
    await deleteDB(sourceName)
    await deleteDB(targetName)
  })

  it('round-trips dream text and exact media bytes into a fresh database', async () => {
    const dreams = createDreamRepository(source)
    const media = createMediaRepository(source)
    const dream = {
      ...createDraftDream('dream-1', new Date('2026-08-25T00:00:00.000Z')),
      status: 'saved' as const,
      rawText: '水面尽头有一扇门',
      audioAssetIds: ['audio-1'],
    }
    await dreams.put(dream)
    await media.put({
      id: 'audio-1',
      dreamId: dream.id,
      kind: 'audio',
      mimeType: 'audio/webm',
      size: 3,
      createdAt: dream.createdAt,
      blob: new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/webm' }),
    })

    const archive = await createBackup(source)
    const inspection = await inspectBackup(archive)
    const report = await restoreBackup(target, inspection)

    expect(inspection.counts).toEqual({ dreams: 1, media: 1 })
    expect(report).toEqual({ imported: 1, skipped: 0, conflictCopies: 0 })
    expect((await target.get('dreams', dream.id))?.rawText).toBe(dream.rawText)
    const restoredAudio = await target.get('media', 'audio-1')
    expect([...new Uint8Array(await restoredAudio!.blob.arrayBuffer())]).toEqual([1, 2, 3])
  })

  it('rejects incompatible, malformed and incomplete archives before restore', async () => {
    const incompatible = blobFromZip({
      'manifest.json': strToU8(JSON.stringify({ schemaVersion: 2, dreamCount: 0, mediaCount: 0, media: [] })),
      'dreams.json': strToU8('[]'),
    })
    const malformed = blobFromZip({
      'manifest.json': strToU8('{not-json'),
      'dreams.json': strToU8('[]'),
    })
    const missingMedia = blobFromZip({
      'manifest.json': strToU8(
        JSON.stringify({
          schemaVersion: 1,
          exportedAt: '2026-08-25T00:00:00.000Z',
          dreamCount: 0,
          mediaCount: 1,
          media: [
            {
              id: 'audio-1',
              dreamId: 'dream-1',
              kind: 'audio',
              mimeType: 'audio/webm',
              size: 3,
              createdAt: '2026-08-25T00:00:00.000Z',
              path: 'media/audio-1.webm',
            },
          ],
        }),
      ),
      'dreams.json': strToU8('[]'),
    })

    await expect(inspectBackup(incompatible)).rejects.toThrow('不支持的备份版本')
    await expect(inspectBackup(malformed)).rejects.toThrow('备份文件格式不正确')
    await expect(inspectBackup(missingMedia)).rejects.toThrow('备份缺少媒体文件')
  })

  it('creates a tagged copy instead of overwriting a same-ID different dream', async () => {
    const sourceDream = {
      ...createDraftDream('dream-1', new Date('2026-08-25T00:00:00.000Z')),
      status: 'saved' as const,
      rawText: '来自备份的内容',
    }
    await source.put('dreams', sourceDream)
    await target.put('dreams', { ...sourceDream, rawText: '本机已有的不同内容' })
    const inspection = await inspectBackup(await createBackup(source))

    const report = await restoreBackup(target, inspection)
    const restoredDreams = await target.getAll('dreams')

    expect(report).toEqual({ imported: 1, skipped: 0, conflictCopies: 1 })
    expect(restoredDreams).toHaveLength(2)
    expect(restoredDreams.find((dream) => dream.id !== 'dream-1')?.tags).toContain('恢复副本')
    expect((await target.get('dreams', 'dream-1'))?.rawText).toBe('本机已有的不同内容')
  })
})
