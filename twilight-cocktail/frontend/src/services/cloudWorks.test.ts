import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { WorkRecord } from '@/stores/works'
import {
  CLOUD_WORKS_COLLECTION,
  buildCloudWorksIdentity,
  clearCloudWorksSession,
  createCloudWorkDocument,
  createCloudWorkChunks,
  fetchCloudWorks,
  getCloudWorksSession,
  loginCloudWorksAccount,
  syncCloudWorks,
  toCloudWorkWriteData,
  toWorkRecordFromCloudDocument,
} from './cloudWorks'

const record: WorkRecord = {
  id: 'work-1',
  madeAt: '2026-08-03',
  cocktailSlug: 'mojito',
  cocktailName: '莫吉托',
  photoDataUrl: 'data:image/jpeg;base64,abc',
  ingredientsText: '基酒：朗姆酒',
  ingredientGroups: {
    baseLiquors: ['朗姆酒'],
    flavorLiquors: [],
    beverages: ['苏打水'],
    other: '薄荷叶',
  },
  rating: 5,
  mood: '清爽',
  selfReview: '比例不错',
  notes: '周末补记',
  createdAt: '2026-08-03T12:00:00.000Z',
}

describe('cloud works service', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('uses the existing works collection for the cloud function backend', () => {
    expect(CLOUD_WORKS_COLLECTION).toBe('works')
  })

  it('builds stable account identity without storing the plain password', async () => {
    const first = await buildCloudWorksIdentity(' Bai ', 'secret')
    const second = await buildCloudWorksIdentity('bai', 'secret')

    expect(first.accountName).toBe('Bai')
    expect(first.accountNameKey).toBe(second.accountNameKey)
    expect(first.passwordVerifier).toBe(second.passwordVerifier)
    expect(first.passwordVerifier).not.toContain('secret')
  })

  it('creates a cloud account session through the HTTP cloud function', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, status: 'account_not_found' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const session = await loginCloudWorksAccount('mix', 'pass')

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][1].body).toContain('"action":"account-login"')
    expect(fetchMock.mock.calls[1][1].body).toContain('"action":"account-create"')
    expect(getCloudWorksSession()).toMatchObject({
      accountName: 'mix',
      accountNameKey: session.accountNameKey,
      passwordVerifier: session.passwordVerifier,
    })
  })

  it('syncs and fetches work records through the saved cloud account session', async () => {
    window.localStorage.setItem(
      'twilight_cloud_works_session',
      JSON.stringify({
        accountName: 'mix',
        accountNameKey: 'account-key',
        passwordVerifier: 'password-verifier',
        updatedAt: '2026-08-03T12:00:00.000Z',
      }),
    )
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ ok: true, status: 'started', recordCount: 1, uploadId: 'up-1' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, status: 'chunk_saved', chunkIndex: 0 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, status: 'saved', recordCount: 1 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            ok: true,
            status: 'matched',
            payload: {
              version: 1,
              app: 'twilight-mixbook',
              type: 'work-records',
              records: [record],
            },
          }),
      })
    vi.stubGlobal('fetch', fetchMock)

    await syncCloudWorks([record])
    const records = await fetchCloudWorks()

    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(fetchMock.mock.calls[0][1].body).toContain('"action":"works-put-start"')
    expect(fetchMock.mock.calls[0][1].body).toContain('"recordCount":1')
    expect(fetchMock.mock.calls[1][1].body).toContain('"action":"works-put-chunk"')
    expect(fetchMock.mock.calls[1][1].body).toContain('"uploadId":"up-1"')
    expect(fetchMock.mock.calls[1][1].body).toContain('"chunkIndex":0')
    expect(fetchMock.mock.calls[1][1].body).toContain('"payloadText"')
    expect(fetchMock.mock.calls[2][1].body).toContain('"action":"works-put-commit"')
    expect(fetchMock.mock.calls[2][1].body).toContain('"uploadId":"up-1"')
    expect(fetchMock.mock.calls[3][1].body).toContain('"action":"works-get"')
    expect(records).toEqual([record])
  })

  it('splits the serialized work payload into bounded text chunks', () => {
    const largeRecord = {
      ...record,
      id: 'large-work',
      photoDataUrl: `data:image/jpeg;base64,${'a'.repeat(700)}`,
    }

    const chunks = createCloudWorkChunks([largeRecord], 160)
    const restoredPayload = JSON.parse(chunks.map((chunk) => chunk.payloadText).join('')) as {
      records: WorkRecord[]
    }

    expect(chunks.length).toBeGreaterThan(1)
    chunks.forEach((chunk) => {
      expect(chunk.payloadText.length).toBeLessThanOrEqual(160)
    })
    expect(restoredPayload.records[0]).toMatchObject({
      id: 'large-work',
      photoDataUrl: largeRecord.photoDataUrl,
    })
  })

  it('requires cloud account login before syncing records', async () => {
    await expect(syncCloudWorks([record])).rejects.toThrow('请先在作品分享里登录云端账号。')
  })

  it('clears the saved cloud session', async () => {
    window.localStorage.setItem(
      'twilight_cloud_works_session',
      JSON.stringify({
        accountName: 'mix',
        accountNameKey: 'account-key',
        passwordVerifier: 'password-verifier',
        updatedAt: '2026-08-03T12:00:00.000Z',
      }),
    )

    clearCloudWorksSession()

    expect(getCloudWorksSession()).toBeNull()
  })

  it('serializes work records with owner and timestamps for legacy document storage', () => {
    expect(createCloudWorkDocument(record, 'user-1')).toEqual({
      _id: 'work-1',
      ownerId: 'user-1',
      madeAt: '2026-08-03',
      cocktailSlug: 'mojito',
      cocktailName: '莫吉托',
      photoDataUrl: 'data:image/jpeg;base64,abc',
      photoFileId: '',
      ingredientsText: '基酒：朗姆酒',
      ingredientGroups: record.ingredientGroups,
      rating: 5,
      mood: '清爽',
      selfReview: '比例不错',
      notes: '周末补记',
      createdAt: '2026-08-03T12:00:00.000Z',
      updatedAt: expect.any(String),
    })
  })

  it('omits document id from set payload when writing by document id', () => {
    const writeData = toCloudWorkWriteData(createCloudWorkDocument(record, 'user-1'))

    expect(writeData).not.toHaveProperty('_id')
    expect(writeData).toMatchObject({
      ownerId: 'user-1',
      cocktailName: '莫吉托',
    })
  })

  it('normalizes cloud documents back to local work records', () => {
    expect(
      toWorkRecordFromCloudDocument({
        ...createCloudWorkDocument(record, 'user-1'),
        _id: 'cloud-id',
      }),
    ).toMatchObject({
      id: 'cloud-id',
      madeAt: '2026-08-03',
      cocktailName: '莫吉托',
      ingredientGroups: record.ingredientGroups,
      rating: 5,
    })
  })
})
