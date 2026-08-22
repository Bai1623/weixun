import { Blob as NodeBlob } from 'node:buffer'

import { afterEach, describe, expect, it } from 'vitest'

import {
  clearAllWorkPhotos,
  deleteWorkPhotos,
  getWorkPhoto,
  hasCachedPreview,
  listPendingWorkPhotos,
  putWorkPhoto,
  setWorkPhotoSyncState,
  type CachedWorkPhoto,
} from './workPhotoCache'

const createdWorkIds = new Set<string>()

const photoRecord = (
  workId: string,
  kind: CachedWorkPhoto['kind'],
  syncState: CachedWorkPhoto['syncState'] = 'pending',
): CachedWorkPhoto => {
  createdWorkIds.add(workId)
  const mime = kind === 'preview' ? 'image/jpeg' : 'image/heic'
  return {
    workId,
    revision: 'rev-1',
    kind,
    blob: new NodeBlob([kind === 'preview' ? 'preview' : 'original'], {
      type: mime,
    }) as unknown as Blob,
    name: kind === 'preview' ? 'preview.jpg' : 'IMG_0001.HEIC',
    mime,
    size: kind === 'preview' ? 7 : 8,
    syncState,
    errorMessage: '',
    updatedAt: '2026-08-22T06:00:00.000Z',
  }
}

afterEach(async () => {
  await Promise.all(Array.from(createdWorkIds, (workId) => deleteWorkPhotos(workId)))
  createdWorkIds.clear()
  window.localStorage.clear()
})

describe('work photo cache', () => {
  it('stores original and preview blobs without using localStorage', async () => {
    await putWorkPhoto(photoRecord('cache-work-1', 'original'))
    await putWorkPhoto(photoRecord('cache-work-1', 'preview'))

    const original = await getWorkPhoto('cache-work-1', 'rev-1', 'original')
    const preview = await getWorkPhoto('cache-work-1', 'rev-1', 'preview')

    expect(original).toMatchObject({ name: 'IMG_0001.HEIC', mime: 'image/heic', size: 8 })
    expect(original?.blob).toMatchObject({ size: 8, type: 'image/heic' })
    expect(preview).toMatchObject({ name: 'preview.jpg', mime: 'image/jpeg', size: 7 })
    expect(window.localStorage.length).toBe(0)
  })

  it('lists every unfinished work photo for retry after a reload', async () => {
    await putWorkPhoto(photoRecord('cache-work-pending', 'preview', 'pending'))
    await putWorkPhoto(photoRecord('cache-work-failed', 'preview', 'failed'))
    await putWorkPhoto(photoRecord('cache-work-uploading', 'preview', 'uploading'))
    await putWorkPhoto(photoRecord('cache-work-synced', 'preview', 'synced'))

    const pending = await listPendingWorkPhotos()

    expect(pending.map((item) => item.workId)).toEqual(
      expect.arrayContaining(['cache-work-pending', 'cache-work-failed', 'cache-work-uploading']),
    )
    expect(pending.map((item) => item.workId)).not.toContain('cache-work-synced')
  })

  it('updates sync state and matches previews by revision', async () => {
    await putWorkPhoto(photoRecord('cache-work-state', 'preview'))

    expect(await hasCachedPreview('cache-work-state', 'rev-1')).toBe(true)
    expect(await hasCachedPreview('cache-work-state', 'rev-2')).toBe(false)

    await setWorkPhotoSyncState('cache-work-state', 'rev-1', 'failed', '网络中断')
    expect(await getWorkPhoto('cache-work-state', 'rev-1', 'preview')).toMatchObject({
      syncState: 'failed',
      errorMessage: '网络中断',
    })

    await deleteWorkPhotos('cache-work-state')
    expect(await getWorkPhoto('cache-work-state', 'rev-1', 'preview')).toBeUndefined()
  })

  it('clears every cached work photo when the active cloud account changes', async () => {
    await putWorkPhoto(photoRecord('cache-work-first', 'preview'))
    await putWorkPhoto(photoRecord('cache-work-second', 'original'))

    await clearAllWorkPhotos()

    expect(await getWorkPhoto('cache-work-first', 'rev-1', 'preview')).toBeUndefined()
    expect(await getWorkPhoto('cache-work-second', 'rev-1', 'original')).toBeUndefined()
  })
})
