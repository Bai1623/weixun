import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { WorkRecord } from '@/stores/works'
import {
  CLOUD_WORKS_COLLECTION,
  activateCloudWorksAccount,
  buildCloudWorksIdentity,
  clearCloudWorksSession,
  createEmptyCloudAppData,
  createCloudAppDataChunks,
  createCloudWorkDocument,
  createCloudWorkChunks,
  fetchCloudAppData,
  fetchCloudAppDataSnapshot,
  fetchCloudSnapshotSummary,
  fetchCloudWorks,
  getCloudWorksSession,
  loginCloudWorksAccount,
  prepareCloudPhotoDownloads,
  prepareCloudPhotoUpload,
  previewCloudWorksAccount,
  syncCloudMetadataPatch,
  syncCloudAppData,
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

  it('previews a new cloud account without creating or persisting it', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, status: 'account_not_found', recordCount: 0 }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const preview = await previewCloudWorksAccount('target', 'pass')

    expect(preview).toMatchObject({
      status: 'new',
      recordCount: 0,
      appData: createEmptyCloudAppData(),
      session: { accountName: 'target' },
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][1].body).toContain('"action":"account-login"')
    expect(getCloudWorksSession()).toBeNull()
  })

  it('previews matched cloud data without replacing the current session', async () => {
    const currentSession = {
      accountName: 'current',
      accountNameKey: 'current-account-key',
      passwordVerifier: 'current-password-verifier',
      updatedAt: '2026-08-22T10:00:00.000Z',
    }
    window.localStorage.setItem('twilight_cloud_works_session', JSON.stringify(currentSession))
    const appData = {
      ...createEmptyCloudAppData(),
      works: [record],
      pantry: { ingredientSlugs: ['gin'] },
    }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, status: 'matched', recordCount: 1 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, status: 'matched', payload: appData }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const preview = await previewCloudWorksAccount('target', 'pass')

    expect(preview).toMatchObject({ status: 'matched', recordCount: 1, appData })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][1].body).toContain('"action":"works-get-start"')
    expect(getCloudWorksSession()).toEqual(currentSession)
  })

  it('creates and persists a new cloud account only when activated', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, status: 'account_not_found', recordCount: 0 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, status: 'created', recordCount: 0 }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const preview = await previewCloudWorksAccount('target', 'pass')
    expect(getCloudWorksSession()).toBeNull()

    const session = await activateCloudWorksAccount(preview)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][1].body).toContain('"action":"account-create"')
    expect(getCloudWorksSession()).toEqual(session)
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
    expect(fetchMock.mock.calls[3][1].body).toContain('"action":"works-get-start"')
    expect(records).toEqual([record])
  })

  it('syncs and fetches the full account app data package through the cloud function', async () => {
    window.localStorage.setItem(
      'twilight_cloud_works_session',
      JSON.stringify({
        accountName: 'mix',
        accountNameKey: 'account-key',
        passwordVerifier: 'password-verifier',
        updatedAt: '2026-08-03T12:00:00.000Z',
      }),
    )
    const appData = {
      version: 1 as const,
      app: 'twilight-mixbook' as const,
      type: 'app-data' as const,
      works: [record],
      pantry: { ingredientSlugs: ['gin', 'tonic-water'] },
      favorites: { cocktailSlugs: ['mojito'] },
      academy: { completedSlugs: ['tools'] },
      dailyPick: {
        selectedSlug: 'negroni',
        selectedDate: '2026-08-08',
        reason: '今晚适合苦甜风味。',
        rerollCount: 2,
      },
      customOptions: {
        cocktails: [],
        flavorLiquors: ['蓝橙力娇酒'],
        beverages: ['水溶C'],
      },
      autoBackup: {
        enabled: true,
        lastBackupAt: '2026-08-08T10:00:00.000Z',
      },
    }
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
            payload: appData,
          }),
      })
    vi.stubGlobal('fetch', fetchMock)

    await syncCloudAppData(appData)
    const restored = await fetchCloudAppData()

    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(fetchMock.mock.calls[0][1].body).toContain('"action":"works-put-start"')
    expect(fetchMock.mock.calls[0][1].body).toContain('"payloadType":"app-data"')
    expect(fetchMock.mock.calls[1][1].body).toContain('"type":"app-data"')
    expect(fetchMock.mock.calls[2][1].body).toContain('"payloadType":"app-data"')
    expect(restored).toEqual(appData)
  })

  it('fetches a typed cloud snapshot summary with server backup timestamps', async () => {
    window.localStorage.setItem(
      'twilight_cloud_works_session',
      JSON.stringify({
        accountName: 'mix',
        accountNameKey: 'account-key',
        passwordVerifier: 'password-verifier',
        updatedAt: '2026-08-22T10:00:00.000Z',
      }),
    )
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          status: 'matched',
          accountName: 'mix',
          snapshotId: '2026-08-22T11:00:00.000Z',
          backupCreatedAt: '2026-08-22T11:00:00.000Z',
          dataLastBackupAt: '2026-08-22T10:59:59.000Z',
          recordCount: 2,
          summary: {
            works: 2,
            previewPhotos: 2,
            originalPhotos: 1,
            pantry: 3,
            favorites: 1,
            academy: 4,
            dailyPick: 1,
            customCocktails: 2,
            customFlavorLiquors: 1,
            customBeverages: 2,
          },
        }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const summary = await fetchCloudSnapshotSummary()

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      action: 'account-summary',
      accountNameKey: 'account-key',
    })
    expect(summary).toEqual({
      status: 'matched',
      accountName: 'mix',
      snapshotId: '2026-08-22T11:00:00.000Z',
      backupCreatedAt: '2026-08-22T11:00:00.000Z',
      dataLastBackupAt: '2026-08-22T10:59:59.000Z',
      recordCount: 2,
      summary: {
        works: 2,
        previewPhotos: 2,
        originalPhotos: 1,
        pantry: 3,
        favorites: 1,
        academy: 4,
        dailyPick: 1,
        customCocktails: 2,
        customFlavorLiquors: 1,
        customBeverages: 2,
      },
    })
  })

  it('rejects the legacy unknown-action response instead of treating the cloud as empty', async () => {
    window.localStorage.setItem(
      'twilight_cloud_works_session',
      JSON.stringify({
        accountName: 'mix',
        accountNameKey: 'account-key',
        passwordVerifier: 'password-verifier',
        updatedAt: '2026-08-22T10:00:00.000Z',
      }),
    )
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ok: true, status: 'ok' }),
      }),
    )

    await expect(fetchCloudSnapshotSummary()).rejects.toThrow(
      '云函数不支持云端备份摘要，请先部署新版 twilightWorks 云函数后再试。',
    )
  })

  it('stages full cloud app data with the exact snapshot version', async () => {
    window.localStorage.setItem(
      'twilight_cloud_works_session',
      JSON.stringify({
        accountName: 'mix',
        accountNameKey: 'account-key',
        passwordVerifier: 'password-verifier',
        updatedAt: '2026-08-22T10:00:00.000Z',
      }),
    )
    const appData = {
      ...createEmptyCloudAppData(),
      works: [record],
      pantry: { ingredientSlugs: ['gin'] },
    }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            ok: true,
            status: 'matched',
            snapshotId: '2026-08-22T11:00:00.000Z',
            backupCreatedAt: '2026-08-22T11:00:00.000Z',
            payload: appData,
          }),
      }),
    )

    await expect(fetchCloudAppDataSnapshot()).resolves.toEqual({
      appData,
      snapshotId: '2026-08-22T11:00:00.000Z',
      backupCreatedAt: '2026-08-22T11:00:00.000Z',
    })
  })

  it('syncs a lightweight metadata patch without photo payloads', async () => {
    window.localStorage.setItem(
      'twilight_cloud_works_session',
      JSON.stringify({
        accountName: 'mix',
        accountNameKey: 'account-key',
        passwordVerifier: 'password-verifier',
        updatedAt: '2026-08-03T12:00:00.000Z',
      }),
    )
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          status: 'metadata_saved',
          metadataUpdatedAt: '2026-08-10T10:01:00.000Z',
          recordCount: 1,
          changedCount: 1,
          deletedCount: 0,
        }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const syncResult = await syncCloudMetadataPatch(
      {
        version: 1,
        app: 'twilight-mixbook',
        type: 'metadata-patch',
        changedAt: '2026-08-10T10:00:00.000Z',
        worksChanged: [record],
        worksDeleted: [],
        pantry: { ingredientSlugs: ['gin'] },
        favorites: { cocktailSlugs: ['mojito'] },
        academy: { completedSlugs: ['tools'] },
        dailyPick: { selectedSlug: 'negroni', selectedDate: '', reason: '', rerollCount: 0 },
        customOptions: { cocktails: [], flavorLiquors: ['蓝橙力娇酒'], beverages: ['水溶C'] },
        autoBackup: { enabled: false, lastBackupAt: '' },
      },
      'snapshot-before',
    )

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.action).toBe('metadata-patch')
    expect(body.expectedSnapshotId).toBe('snapshot-before')
    expect(body.operationId).toBe('2026-08-10T10:00:00.000Z')
    expect(body.patch.worksChanged[0]).toMatchObject({
      id: record.id,
      cocktailName: record.cocktailName,
      photoDataUrl: '',
    })
    expect(JSON.stringify(body)).not.toContain('data:image/jpeg;base64,abc')
    expect(syncResult).toEqual({
      snapshotId: '2026-08-10T10:01:00.000Z',
      recordCount: 1,
    })
  })

  it('surfaces a server-side snapshot conflict without retrying the write', async () => {
    window.localStorage.setItem(
      'twilight_cloud_works_session',
      JSON.stringify({
        accountName: 'mix',
        accountNameKey: 'account-key',
        passwordVerifier: 'password-verifier',
        updatedAt: '2026-08-22T06:00:00.000Z',
      }),
    )
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          status: 'snapshot_conflict',
          snapshotId: 'snapshot-new',
        }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      syncCloudMetadataPatch(
        {
          version: 1,
          app: 'twilight-mixbook',
          type: 'metadata-patch',
          changedAt: '2026-08-22T06:00:00.000Z',
          worksChanged: [],
          worksDeleted: [],
          pantry: { ingredientSlugs: [] },
          favorites: { cocktailSlugs: [] },
          academy: { completedSlugs: [] },
          dailyPick: { selectedSlug: '', selectedDate: '', reason: '', rerollCount: 0 },
          customOptions: { cocktails: [], flavorLiquors: [], beverages: [] },
          autoBackup: { enabled: false, lastBackupAt: '' },
        },
        'snapshot-old',
      ),
    ).rejects.toThrow('云端备份在上传期间发生了变化，请先恢复最新云端数据后再试。')
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('retries an idempotent metadata patch once after a temporary connection failure', async () => {
    window.localStorage.setItem(
      'twilight_cloud_works_session',
      JSON.stringify({
        accountName: 'mix',
        accountNameKey: 'account-key',
        passwordVerifier: 'password-verifier',
        updatedAt: '2026-08-22T06:00:00.000Z',
      }),
    )
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('temporary network failure'))
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, status: 'metadata_saved' }),
      })
    vi.stubGlobal('fetch', fetchMock)

    await syncCloudMetadataPatch({
      version: 1,
      app: 'twilight-mixbook',
      type: 'metadata-patch',
      changedAt: '2026-08-22T06:00:00.000Z',
      worksChanged: [],
      worksDeleted: [],
      pantry: { ingredientSlugs: [] },
      favorites: { cocktailSlugs: [] },
      academy: { completedSlugs: [] },
      dailyPick: { selectedSlug: '', selectedDate: '', reason: '', rerollCount: 0 },
      customOptions: { cocktails: [], flavorLiquors: [], beverages: [] },
      autoBackup: { enabled: false, lastBackupAt: '' },
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('requests validated upload and download targets through the active cloud session', async () => {
    window.localStorage.setItem(
      'twilight_cloud_works_session',
      JSON.stringify({
        accountName: 'mix',
        accountNameKey: 'a'.repeat(64),
        passwordVerifier: 'b'.repeat(64),
        updatedAt: '2026-08-22T06:00:00.000Z',
      }),
    )
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            ok: true,
            mode: 'original-and-preview',
            photoRevision: 'rev-1',
            expiresAt: '2026-08-22T06:15:00.000Z',
            original: {
              objectKey: 'photos/account/work-1/rev-1/original.jpg',
              url: 'https://signed.example/original',
              method: 'PUT',
              contentType: 'image/jpeg',
              expiresAt: '2026-08-22T06:15:00.000Z',
            },
            preview: {
              objectKey: 'photos/account/work-1/rev-1/preview.jpg',
              url: 'https://signed.example/preview',
              method: 'PUT',
              contentType: 'image/jpeg',
              expiresAt: '2026-08-22T06:15:00.000Z',
            },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            ok: true,
            downloads: [
              {
                workId: 'work-1',
                objectKey: 'photos/account/work-1/rev-1/preview.jpg',
                url: 'https://signed.example/download',
                method: 'GET',
                expiresAt: '2026-08-22T06:15:00.000Z',
              },
            ],
          }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const upload = await prepareCloudPhotoUpload({
      workId: 'work-1',
      photoRevision: 'rev-1',
      mode: 'original-and-preview',
      original: { name: 'photo.jpg', type: 'image/jpeg', size: 4000 },
      preview: { type: 'image/jpeg', size: 400 },
    })
    const downloads = await prepareCloudPhotoDownloads(['work-1'], 'preview')

    expect(upload.original?.method).toBe('PUT')
    expect(downloads[0].workId).toBe('work-1')
    const uploadBody = JSON.parse(fetchMock.mock.calls[0][1].body)
    const downloadBody = JSON.parse(fetchMock.mock.calls[1][1].body)
    expect(uploadBody).toMatchObject({
      action: 'photo-upload-prepare',
      accountNameKey: 'a'.repeat(64),
      workId: 'work-1',
    })
    expect(downloadBody).toMatchObject({
      action: 'photo-download-prepare',
      kind: 'preview',
      workIds: ['work-1'],
    })
  })

  it('retries an idempotent photo preparation once after a temporary connection failure', async () => {
    window.localStorage.setItem(
      'twilight_cloud_works_session',
      JSON.stringify({
        accountName: 'mix',
        accountNameKey: 'a'.repeat(64),
        passwordVerifier: 'b'.repeat(64),
        updatedAt: '2026-08-22T06:00:00.000Z',
      }),
    )
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('temporary network failure'))
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            ok: true,
            mode: 'preview-only',
            photoRevision: 'rev-retry',
            expiresAt: '2026-08-22T06:15:00.000Z',
            preview: {
              objectKey: 'photos/account/work-retry/rev-retry/preview.jpg',
              url: 'https://signed.example/preview-retry',
              method: 'PUT',
              contentType: 'image/jpeg',
              expiresAt: '2026-08-22T06:15:00.000Z',
            },
          }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const result = await prepareCloudPhotoUpload({
      workId: 'work-retry',
      photoRevision: 'rev-retry',
      mode: 'preview-only',
      preview: { type: 'image/jpeg', size: 400 },
    })

    expect(result.preview.objectKey).toContain('work-retry')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('fetches full account app data through bounded download chunks', async () => {
    window.localStorage.setItem(
      'twilight_cloud_works_session',
      JSON.stringify({
        accountName: 'mix',
        accountNameKey: 'account-key',
        passwordVerifier: 'password-verifier',
        updatedAt: '2026-08-03T12:00:00.000Z',
      }),
    )
    const appData = {
      version: 1 as const,
      app: 'twilight-mixbook' as const,
      type: 'app-data' as const,
      works: [
        {
          ...record,
          id: 'large-cloud-work',
          photoDataUrl: `data:image/jpeg;base64,${'a'.repeat(2000)}`,
        },
      ],
      pantry: { ingredientSlugs: ['gin'] },
      favorites: { cocktailSlugs: [] },
      academy: { completedSlugs: [] },
      dailyPick: { selectedSlug: '', selectedDate: '', reason: '', rerollCount: 0 },
      customOptions: { cocktails: [], flavorLiquors: [], beverages: [] },
      autoBackup: { enabled: false, lastBackupAt: '' },
    }
    const payloadText = JSON.stringify(appData)
    const firstChunk = payloadText.slice(0, 1200)
    const secondChunk = payloadText.slice(1200)
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            ok: true,
            status: 'chunked',
            chunkCount: 2,
            recordCount: 1,
            payloadType: 'app-data',
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            ok: true,
            status: 'chunk',
            chunkIndex: 0,
            payloadText: firstChunk,
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            ok: true,
            status: 'chunk',
            chunkIndex: 1,
            payloadText: secondChunk,
          }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const restored = await fetchCloudAppData()

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[0][1].body).toContain('"action":"works-get-start"')
    expect(fetchMock.mock.calls[1][1].body).toContain('"action":"works-get-chunk"')
    expect(fetchMock.mock.calls[1][1].body).toContain('"chunkIndex":0')
    expect(fetchMock.mock.calls[2][1].body).toContain('"chunkIndex":1')
    expect(restored).toEqual(appData)
  })

  it('normalizes legacy work-record payloads into an app data package', async () => {
    window.localStorage.setItem(
      'twilight_cloud_works_session',
      JSON.stringify({
        accountName: 'mix',
        accountNameKey: 'account-key',
        passwordVerifier: 'password-verifier',
        updatedAt: '2026-08-03T12:00:00.000Z',
      }),
    )
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
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
      }),
    )

    const restored = await fetchCloudAppData()

    expect(restored.works).toEqual([record])
    expect(restored.pantry.ingredientSlugs).toEqual([])
    expect(restored.customOptions.beverages).toEqual([])
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

  it('splits the serialized app data payload into bounded text chunks', () => {
    const chunks = createCloudAppDataChunks(
      {
        version: 1,
        app: 'twilight-mixbook',
        type: 'app-data',
        works: [record],
        pantry: { ingredientSlugs: ['gin'] },
        favorites: { cocktailSlugs: ['mojito'] },
        academy: { completedSlugs: ['tools'] },
        dailyPick: { selectedSlug: '', selectedDate: '', reason: '', rerollCount: 0 },
        customOptions: { cocktails: [], flavorLiquors: [], beverages: ['水溶C'.repeat(30)] },
        autoBackup: { enabled: false, lastBackupAt: '' },
      },
      180,
    )
    const restoredPayload = JSON.parse(chunks.map((chunk) => chunk.payloadText).join('')) as {
      type: string
      works: WorkRecord[]
    }

    expect(chunks.length).toBeGreaterThan(1)
    expect(restoredPayload.type).toBe('app-data')
    expect(restoredPayload.works[0].id).toBe(record.id)
  })

  it('requires cloud account login before syncing records', async () => {
    await expect(syncCloudWorks([record])).rejects.toThrow('请先在作品分享里登录云端账号。')
  })

  it('uses neutral sync wording when the cloud function cannot be reached', async () => {
    window.localStorage.setItem(
      'twilight_cloud_works_session',
      JSON.stringify({
        accountName: 'mix',
        accountNameKey: 'account-key',
        passwordVerifier: 'password-verifier',
        updatedAt: '2026-08-03T12:00:00.000Z',
      }),
    )
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(fetchCloudAppData()).rejects.toThrow(
      '无法连接云函数。若登录正常但同步失败，请重新部署新版 twilightWorks 云函数后再试。',
    )
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
