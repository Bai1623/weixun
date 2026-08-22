import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getWorkPhoto, putWorkPhoto, type CachedWorkPhoto } from '@/services/workPhotoCache'

const { prepareCloudPhotoUpload, prepareCloudPhotoDownloads } = vi.hoisted(() => ({
  prepareCloudPhotoUpload: vi.fn(),
  prepareCloudPhotoDownloads: vi.fn(),
}))

vi.mock('@/services/cloudWorks', () => ({
  prepareCloudPhotoUpload,
  prepareCloudPhotoDownloads,
}))

import {
  cachePreparedWorkPhoto,
  prepareWorkPhoto,
  restoreAllWorkPreviews,
  uploadCachedWorkPhoto,
} from '@/services/workPhotos'

const makeCachedPhoto = (kind: 'original' | 'preview', blob: Blob): CachedWorkPhoto => ({
  workId: 'work-1',
  revision: 'revision-1',
  kind,
  blob,
  name: kind === 'original' ? 'night.png' : 'preview.jpg',
  mime: blob.type,
  size: blob.size,
  syncState: 'pending',
  errorMessage: '',
  updatedAt: '2026-08-22T00:00:00.000Z',
})

describe('workPhotos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('keeps the original file and creates a JPEG preview', async () => {
    const file = new File(['original bytes'], 'night.png', { type: 'image/png' })
    const preview = new Blob(['preview bytes'], { type: 'image/jpeg' })

    const prepared = await prepareWorkPhoto(file, async () => preview)

    expect(prepared.original).toBe(file)
    expect(prepared.preview).toBe(preview)
    expect(prepared.revision).toMatch(/^[a-zA-Z0-9-]+$/)
    expect(prepared.previewDataUrl).toContain('data:image/jpeg;base64,')
  })

  it('rejects non-images and originals larger than 50 MB', async () => {
    await expect(
      prepareWorkPhoto(new File(['text'], 'note.txt', { type: 'text/plain' })),
    ).rejects.toThrow('图片')

    const oversized = new File(['x'], 'large.jpg', { type: 'image/jpeg' })
    Object.defineProperty(oversized, 'size', { value: 50 * 1024 * 1024 + 1 })
    await expect(prepareWorkPhoto(oversized)).rejects.toThrow('50 MB')
  })

  it('uploads both cached photos with the signed content types', async () => {
    const original = makeCachedPhoto('original', new Blob(['original'], { type: 'image/png' }))
    const preview = makeCachedPhoto('preview', new Blob(['preview'], { type: 'image/jpeg' }))
    await putWorkPhoto(original)
    await putWorkPhoto(preview)
    prepareCloudPhotoUpload.mockResolvedValue({
      mode: 'original-and-preview',
      photoRevision: 'revision-1',
      expiresAt: '2026-08-22T00:15:00.000Z',
      original: {
        objectKey: 'photos/account/work-1/revision-1/original.png',
        url: 'https://oss.example/original',
        method: 'PUT',
        contentType: 'image/png',
        expiresAt: '2026-08-22T00:15:00.000Z',
      },
      preview: {
        objectKey: 'photos/account/work-1/revision-1/preview.jpg',
        url: 'https://oss.example/preview',
        method: 'PUT',
        contentType: 'image/jpeg',
        expiresAt: '2026-08-22T00:15:00.000Z',
      },
    })
    vi.mocked(fetch).mockResolvedValue({ ok: true, status: 200 } as Response)

    const metadata = await uploadCachedWorkPhoto('work-1', 'revision-1')

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      'https://oss.example/original',
      expect.objectContaining({ method: 'PUT', headers: { 'Content-Type': 'image/png' } }),
    )
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      'https://oss.example/preview',
      expect.objectContaining({ method: 'PUT', headers: { 'Content-Type': 'image/jpeg' } }),
    )
    expect(metadata).toMatchObject({
      photoBackupMode: 'original-and-preview',
      photoRevision: 'revision-1',
      photoOriginalName: 'night.png',
      photoOriginalObjectKey: 'photos/account/work-1/revision-1/original.png',
      photoPreviewObjectKey: 'photos/account/work-1/revision-1/preview.jpg',
    })
  })

  it('restores every missing preview and isolates individual failures', async () => {
    await putWorkPhoto({
      ...makeCachedPhoto('preview', new Blob(['existing'], { type: 'image/jpeg' })),
      workId: 'work-existing',
    })
    prepareCloudPhotoDownloads.mockResolvedValue([
      {
        workId: 'restore-1',
        objectKey: 'photos/a/restore-1/revision-1/preview.jpg',
        url: 'https://oss.example/restore-1',
        method: 'GET',
        expiresAt: '2026-08-22T00:15:00.000Z',
      },
      {
        workId: 'restore-2',
        objectKey: 'photos/a/restore-2/revision-2/preview.jpg',
        url: 'https://oss.example/restore-2',
        method: 'GET',
        expiresAt: '2026-08-22T00:15:00.000Z',
      },
    ])
    vi.mocked(fetch).mockImplementation(async (input) => {
      if (input === 'https://oss.example/restore-2') return { ok: false, status: 500 } as Response
      return {
        ok: true,
        status: 200,
        blob: async () => new Blob(['downloaded'], { type: 'image/jpeg' }),
      } as Response
    })
    const progress = vi.fn()

    const result = await restoreAllWorkPreviews(
      [
        { id: 'work-existing', photoRevision: 'revision-1', photoPreviewObjectKey: 'existing' },
        { id: 'restore-1', photoRevision: 'revision-1', photoPreviewObjectKey: 'remote-1' },
        { id: 'restore-2', photoRevision: 'revision-2', photoPreviewObjectKey: 'remote-2' },
      ],
      { onProgress: progress },
    )

    expect(prepareCloudPhotoDownloads).toHaveBeenCalledWith(['restore-1', 'restore-2'], 'preview')
    expect(await getWorkPhoto('restore-1', 'revision-1', 'preview')).toMatchObject({
      syncState: 'synced',
      mime: 'image/jpeg',
    })
    expect(result).toEqual({
      completed: 2,
      total: 2,
      failedWorkIds: ['restore-2'],
      failures: [
        {
          workId: 'restore-2',
          errorMessage: '照片下载失败（HTTP 500）。',
        },
      ],
    })
    expect(progress).toHaveBeenLastCalledWith(result)
  })

  it('reports every affected work when a preview download batch cannot be prepared', async () => {
    prepareCloudPhotoDownloads.mockRejectedValue(new Error('照片签名服务暂不可用'))

    const result = await restoreAllWorkPreviews([
      { id: 'restore-a', photoRevision: 'revision-a', photoPreviewObjectKey: 'remote-a' },
      { id: 'restore-b', photoRevision: 'revision-b', photoPreviewObjectKey: 'remote-b' },
    ])

    expect(result).toEqual({
      completed: 2,
      total: 2,
      failedWorkIds: ['restore-a', 'restore-b'],
      failures: [
        { workId: 'restore-a', errorMessage: '照片签名服务暂不可用' },
        { workId: 'restore-b', errorMessage: '照片签名服务暂不可用' },
      ],
    })
  })

  it('stores prepared original and preview blobs in IndexedDB', async () => {
    const file = new File(['original'], 'night.png', { type: 'image/png' })
    const preview = new Blob(['preview'], { type: 'image/jpeg' })
    await cachePreparedWorkPhoto('work-cache', {
      revision: 'revision-cache',
      original: file,
      preview,
      previewDataUrl: 'data:image/jpeg;base64,cHJldmlldw==',
    })

    expect(await getWorkPhoto('work-cache', 'revision-cache', 'original')).toMatchObject({
      name: 'night.png',
      syncState: 'pending',
    })
    expect(await getWorkPhoto('work-cache', 'revision-cache', 'preview')).toMatchObject({
      name: 'preview.jpg',
      syncState: 'pending',
    })
  })
})
