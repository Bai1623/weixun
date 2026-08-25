import { deleteDB, type IDBPDatabase } from 'idb'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { openShimengDb, type ShimengDb } from '@/core/persistence/db'

import type { AppSettings } from '../model/settings'
import { createSettingsRepository } from './settingsRepository'

describe('settingsRepository', () => {
  let db: IDBPDatabase<ShimengDb>
  let databaseName: string

  beforeEach(async () => {
    databaseName = `shimeng-settings-test-${crypto.randomUUID()}`
    db = await openShimengDb(databaseName)
  })

  afterEach(async () => {
    db.close()
    await deleteDB(databaseName)
  })

  it('round-trips only the accepted non-sensitive application settings', async () => {
    const repository = createSettingsRepository(db)
    const settings: AppSettings = {
      schemaVersion: 1,
      onboardingCompleted: true,
      reducedMotionOverride: 'reduce',
      aiEndpoint: null,
      lastBackupAt: '2026-08-25T00:00:00.000Z',
    }

    expect(await repository.get()).toBeUndefined()
    await repository.put(settings)
    expect(await repository.get()).toEqual(settings)
  })

  it('does not swallow quota errors while writing settings', async () => {
    const cause = new DOMException('quota reached', 'QuotaExceededError')
    const rejectingDb = {
      put: async () => Promise.reject(cause),
    } as unknown as IDBPDatabase<ShimengDb>
    const repository = createSettingsRepository(rejectingDb)

    await expect(
      repository.put({
        schemaVersion: 1,
        onboardingCompleted: false,
        reducedMotionOverride: 'system',
        aiEndpoint: null,
        lastBackupAt: null,
      }),
    ).rejects.toMatchObject({
      name: 'StorageWriteError',
      message: '本机存储空间不足，请先导出备份或删除较大的录音',
      cause,
    })
  })
})
