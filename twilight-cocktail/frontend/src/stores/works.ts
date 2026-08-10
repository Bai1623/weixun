import { defineStore } from 'pinia'

import {
  clearCloudWorksSession,
  fetchCloudAppData,
  getCloudWorksSession,
  loginCloudWorksAccount,
  syncCloudMetadataPatch,
} from '@/services/cloudWorks'
import type { CloudAppData, CloudDeletedWork, CloudMetadataPatch } from '@/services/cloudWorks'
import { useAcademyStore } from '@/stores/academy'
import { useDailyPickStore } from '@/stores/daily'
import { useFavoriteStore } from '@/stores/favorites'
import { usePantryStore } from '@/stores/pantry'
import { getStoredStringArray, setStoredString, setStoredStringArray } from '@/utils/storage'
import {
  readWorkCustomOptionsSnapshot,
  writeWorkCustomOptionsSnapshot,
} from '@/utils/workFormOptions'

const storageKey = 'cocktail_work_records'
const deletedRecordsStorageKey = 'cocktail_work_deleted_records'
const autoBackupStorageKey = 'cocktail_work_auto_backup'
const metadataSyncStorageKeyPrefix = 'twilight_cloud_metadata_sync'
const autoBackupIntervalMs = 24 * 60 * 60 * 1000
const pantryStorageKey = 'pantry_ingredient_slugs'
const favoritesStorageKey = 'favorite_cocktail_slugs'
const academyStorageKey = 'academy_progress'
const dailyPickStorageKeys = {
  selectedSlug: 'daily_pick_slug',
  selectedDate: 'daily_pick_date',
  reason: 'daily_pick_reason',
  rerollCount: 'daily_pick_reroll_count',
} as const

export type WorkRecordInput = {
  madeAt: string
  cocktailSlug: string
  cocktailName: string
  photoDataUrl: string
  ingredientsText: string
  ingredientGroups?: WorkIngredientGroups
  rating: number
  mood: string
  selfReview: string
  notes: string
}

export type WorkRecord = WorkRecordInput & {
  id: string
  createdAt: string
  updatedAt?: string
}

export type WorkIngredientGroups = {
  baseLiquors: string[]
  flavorLiquors: string[]
  beverages: string[]
  other: string
}

export type WorkImportResult = {
  importedCount: number
  skippedCount: number
}

export type WorkCloudSyncStatus = 'idle' | 'syncing' | 'success' | 'error'

export type WorkCloudSyncState = {
  status: WorkCloudSyncStatus
  message: string
  updatedAt: string
}

export type WorkCloudAccountState = {
  accountName: string
  updatedAt: string
}

export type WorkAutoBackupState = {
  enabled: boolean
  lastBackupAt: string
}

const createCloudSyncState = (): WorkCloudSyncState => ({
  status: 'idle',
  message: '尚未同步云端。',
  updatedAt: '',
})

const createCloudAccountState = (): WorkCloudAccountState => {
  const session = getCloudWorksSession()
  return {
    accountName: session?.accountName ?? '',
    updatedAt: session?.updatedAt ?? '',
  }
}

const metadataSyncStorageKey = () => {
  const session = getCloudWorksSession()
  return session ? `${metadataSyncStorageKeyPrefix}:${session.accountNameKey}` : ''
}

const createAutoBackupState = (): WorkAutoBackupState => {
  try {
    const raw = window.localStorage.getItem(autoBackupStorageKey)
    if (!raw) return { enabled: false, lastBackupAt: '' }
    const parsed = JSON.parse(raw) as Partial<WorkAutoBackupState>
    return {
      enabled: Boolean(parsed.enabled),
      lastBackupAt: typeof parsed.lastBackupAt === 'string' ? parsed.lastBackupAt : '',
    }
  } catch {
    return { enabled: false, lastBackupAt: '' }
  }
}

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `work-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')

const toIngredientGroups = (value: unknown): WorkIngredientGroups | undefined => {
  if (!value || typeof value !== 'object') return undefined
  const candidate = value as Partial<WorkIngredientGroups>
  if (
    !isStringArray(candidate.baseLiquors) ||
    !isStringArray(candidate.flavorLiquors) ||
    !isStringArray(candidate.beverages) ||
    typeof candidate.other !== 'string'
  ) {
    return undefined
  }

  return {
    baseLiquors: candidate.baseLiquors,
    flavorLiquors: candidate.flavorLiquors,
    beverages: candidate.beverages,
    other: candidate.other,
  }
}

const toWorkRecord = (item: unknown): WorkRecord | undefined => {
  if (!item || typeof item !== 'object') return undefined
  const candidate = item as Partial<WorkRecord>
  const { id, madeAt, cocktailName, ingredientsText, createdAt } = candidate
  if (
    typeof id !== 'string' ||
    typeof madeAt !== 'string' ||
    typeof cocktailName !== 'string' ||
    typeof ingredientsText !== 'string' ||
    typeof createdAt !== 'string' ||
    (candidate.ingredientGroups !== undefined &&
      toIngredientGroups(candidate.ingredientGroups) === undefined)
  ) {
    return undefined
  }

  return {
    id,
    madeAt,
    cocktailSlug: typeof candidate.cocktailSlug === 'string' ? candidate.cocktailSlug : '',
    cocktailName,
    photoDataUrl: typeof candidate.photoDataUrl === 'string' ? candidate.photoDataUrl : '',
    ingredientsText,
    ingredientGroups: toIngredientGroups(candidate.ingredientGroups),
    rating: typeof candidate.rating === 'number' ? candidate.rating : 0,
    mood: typeof candidate.mood === 'string' ? candidate.mood : '',
    selfReview: typeof candidate.selfReview === 'string' ? candidate.selfReview : '',
    notes: typeof candidate.notes === 'string' ? candidate.notes : '',
    createdAt,
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : createdAt,
  }
}

const normalizeRecord = (record: WorkRecord): WorkRecord => ({
  ...record,
  cocktailName: record.cocktailName.trim(),
  ingredientsText: record.ingredientsText.trim() || formatWorkIngredients(record),
  ingredientGroups: normalizeIngredientGroups(record.ingredientGroups),
  mood: record.mood.trim(),
  selfReview: record.selfReview.trim(),
  notes: record.notes.trim(),
  updatedAt: record.updatedAt || record.createdAt,
})

const readRecords = (): WorkRecord[] => {
  const value = window.localStorage.getItem(storageKey)
  if (!value) return []

  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((item) => {
      const record = toWorkRecord(item)
      return record ? [normalizeRecord(record)] : []
    })
  } catch {
    return []
  }
}

const normalizeIngredientGroups = (
  groups: WorkIngredientGroups | undefined,
): WorkIngredientGroups | undefined => {
  if (!groups) return undefined
  return {
    baseLiquors: groups.baseLiquors
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 4),
    flavorLiquors: Array.from(
      new Set(groups.flavorLiquors.map((item) => item.trim()).filter(Boolean)),
    ),
    beverages: Array.from(new Set(groups.beverages.map((item) => item.trim()).filter(Boolean))),
    other: groups.other.trim(),
  }
}

const formatLine = (label: string, values: readonly string[]) =>
  values.length ? `${label}：${values.join('、')}` : ''

export const formatWorkIngredients = (
  record: Pick<WorkRecordInput, 'ingredientsText' | 'ingredientGroups'>,
) => {
  const groups = normalizeIngredientGroups(record.ingredientGroups)
  if (!groups) return record.ingredientsText.trim()

  return [
    formatLine('基酒', groups.baseLiquors),
    formatLine('调味酒', groups.flavorLiquors),
    formatLine('饮料', groups.beverages),
    groups.other,
  ]
    .filter(Boolean)
    .join('\n')
}

export const exportWorkRecords = (records: readonly WorkRecord[]) =>
  JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      app: 'twilight-mixbook',
      type: 'work-records',
      records,
    },
    null,
    2,
  )

export const importWorkRecords = (
  json: string,
): { records: WorkRecord[]; skippedCount: number } => {
  try {
    const parsed: unknown = JSON.parse(json)
    const payloadRecords = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object'
        ? (parsed as { records?: unknown }).records
        : undefined
    if (!Array.isArray(payloadRecords)) return { records: [], skippedCount: 0 }

    const records = payloadRecords.flatMap((item) => {
      const record = toWorkRecord(item)
      return record ? [normalizeRecord(record)] : []
    })
    return {
      records,
      skippedCount: payloadRecords.length - records.length,
    }
  } catch {
    return { records: [], skippedCount: 0 }
  }
}

const writeRecords = (records: WorkRecord[]) => {
  window.localStorage.setItem(storageKey, JSON.stringify(records))
}

const readDeletedRecords = (): CloudDeletedWork[] => {
  const value = window.localStorage.getItem(deletedRecordsStorageKey)
  if (!value) return []

  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((item) => {
      if (!item || typeof item !== 'object') return []
      const candidate = item as Partial<CloudDeletedWork>
      return typeof candidate.id === 'string' && typeof candidate.deletedAt === 'string'
        ? [{ id: candidate.id, deletedAt: candidate.deletedAt }]
        : []
    })
  } catch {
    return []
  }
}

const writeDeletedRecords = (records: CloudDeletedWork[]) => {
  window.localStorage.setItem(deletedRecordsStorageKey, JSON.stringify(records))
}

const readLastMetadataSyncAt = () => {
  const key = metadataSyncStorageKey()
  return key ? window.localStorage.getItem(key) || '' : ''
}

const writeLastMetadataSyncAt = (timestamp: string) => {
  const key = metadataSyncStorageKey()
  if (key) window.localStorage.setItem(key, timestamp)
}

const writeAutoBackupState = (state: WorkAutoBackupState) => {
  window.localStorage.setItem(autoBackupStorageKey, JSON.stringify(state))
}

const readStoreStringArray = (key: string, storeValues: readonly string[]) =>
  storeValues.length ? [...storeValues] : getStoredStringArray(key)

const createAccountBackupData = (
  works: readonly WorkRecord[],
  autoBackup: WorkAutoBackupState,
): CloudAppData => {
  const pantry = usePantryStore()
  const favorites = useFavoriteStore()
  const academy = useAcademyStore()
  const daily = useDailyPickStore()
  const customOptions = readWorkCustomOptionsSnapshot()

  return {
    version: 1,
    app: 'twilight-mixbook',
    type: 'app-data',
    works: works.map((record) => normalizeRecord(record)),
    pantry: {
      ingredientSlugs: readStoreStringArray(pantryStorageKey, pantry.ingredientSlugs),
    },
    favorites: {
      cocktailSlugs: readStoreStringArray(favoritesStorageKey, favorites.slugs),
    },
    academy: {
      completedSlugs: readStoreStringArray(academyStorageKey, academy.completedSlugs),
    },
    dailyPick: {
      selectedSlug: daily.selectedSlug,
      selectedDate: daily.selectedDate,
      reason: daily.reason,
      rerollCount: daily.rerollCount,
    },
    customOptions,
    autoBackup: { ...autoBackup },
  }
}

const createMetadataRecord = (record: WorkRecord): WorkRecord => ({
  ...normalizeRecord(record),
  photoDataUrl: '',
})

const createAccountMetadataPatch = (
  works: readonly WorkRecord[],
  autoBackup: WorkAutoBackupState,
  changedAt: string,
): CloudMetadataPatch => {
  const appData = createAccountBackupData(works, autoBackup)
  const lastSyncedAt = readLastMetadataSyncAt()
  const worksChanged = lastSyncedAt
    ? appData.works.filter((record) => (record.updatedAt || record.createdAt) > lastSyncedAt)
    : appData.works
  const worksDeleted = readDeletedRecords().filter(
    (record) => !lastSyncedAt || record.deletedAt > lastSyncedAt,
  )

  return {
    version: 1,
    app: 'twilight-mixbook',
    type: 'metadata-patch',
    changedAt,
    worksChanged: worksChanged.map(createMetadataRecord),
    worksDeleted,
    pantry: appData.pantry,
    favorites: appData.favorites,
    academy: appData.academy,
    dailyPick: appData.dailyPick,
    customOptions: appData.customOptions,
    autoBackup: appData.autoBackup,
  }
}

const hasRestorableAccountData = (appData: CloudAppData) =>
  appData.works.length > 0 ||
  appData.pantry.ingredientSlugs.length > 0 ||
  appData.favorites.cocktailSlugs.length > 0 ||
  appData.academy.completedSlugs.length > 0 ||
  Boolean(
    appData.dailyPick.selectedSlug || appData.dailyPick.selectedDate || appData.dailyPick.reason,
  ) ||
  appData.dailyPick.rerollCount > 0 ||
  appData.customOptions.cocktails.length > 0 ||
  appData.customOptions.flavorLiquors.length > 0 ||
  appData.customOptions.beverages.length > 0 ||
  Boolean(appData.autoBackup.enabled || appData.autoBackup.lastBackupAt)

const hasLocalBackupSourceData = (
  works: readonly WorkRecord[],
  autoBackup: WorkAutoBackupState,
) => {
  const appData = createAccountBackupData(works, autoBackup)
  return (
    appData.works.length > 0 ||
    appData.pantry.ingredientSlugs.length > 0 ||
    appData.favorites.cocktailSlugs.length > 0 ||
    appData.academy.completedSlugs.length > 0 ||
    Boolean(
      appData.dailyPick.selectedSlug || appData.dailyPick.selectedDate || appData.dailyPick.reason,
    ) ||
    appData.dailyPick.rerollCount > 0 ||
    appData.customOptions.cocktails.length > 0 ||
    appData.customOptions.flavorLiquors.length > 0 ||
    appData.customOptions.beverages.length > 0
  )
}

const applyAccountBackupData = (appData: CloudAppData) => {
  const pantry = usePantryStore()
  const favorites = useFavoriteStore()
  const academy = useAcademyStore()
  const daily = useDailyPickStore()
  const localPhotosById = new Map(readRecords().map((record) => [record.id, record.photoDataUrl]))
  const restoredWorks = appData.works.map((record) =>
    normalizeRecord({
      ...record,
      photoDataUrl: record.photoDataUrl || localPhotosById.get(record.id) || '',
    }),
  )

  writeRecords(restoredWorks)
  setStoredStringArray(pantryStorageKey, appData.pantry.ingredientSlugs)
  setStoredStringArray(favoritesStorageKey, appData.favorites.cocktailSlugs)
  setStoredStringArray(academyStorageKey, appData.academy.completedSlugs)
  setStoredString(dailyPickStorageKeys.selectedSlug, appData.dailyPick.selectedSlug)
  setStoredString(dailyPickStorageKeys.selectedDate, appData.dailyPick.selectedDate)
  setStoredString(dailyPickStorageKeys.reason, appData.dailyPick.reason)
  setStoredString(dailyPickStorageKeys.rerollCount, String(appData.dailyPick.rerollCount))
  writeWorkCustomOptionsSnapshot(appData.customOptions)

  pantry.ingredientSlugs = [...appData.pantry.ingredientSlugs]
  favorites.slugs = [...appData.favorites.cocktailSlugs]
  academy.completedSlugs = [...appData.academy.completedSlugs]
  daily.selectedSlug = appData.dailyPick.selectedSlug
  daily.selectedDate = appData.dailyPick.selectedDate
  daily.reason = appData.dailyPick.reason
  daily.rerollCount = appData.dailyPick.rerollCount
}

export const useWorkStore = defineStore('works', {
  state: () => ({
    items: readRecords(),
    cloudSync: createCloudSyncState(),
    cloudAccount: createCloudAccountState(),
    autoBackup: createAutoBackupState(),
  }),
  getters: {
    totalCount: (state) => state.items.length,
    latestItems: (state) =>
      [...state.items].sort((a, b) =>
        `${b.madeAt}-${b.createdAt}`.localeCompare(`${a.madeAt}-${a.createdAt}`),
      ),
    averageRating: (state) => {
      const ratedItems = state.items.filter((item) => item.rating > 0)
      if (!ratedItems.length) return 0
      const total = ratedItems.reduce((sum, item) => sum + item.rating, 0)
      return Math.round((total / ratedItems.length) * 10) / 10
    },
  },
  actions: {
    add(input: WorkRecordInput): WorkRecord {
      const createdAt = new Date().toISOString()
      const record: WorkRecord = {
        ...input,
        ingredientsText: input.ingredientsText.trim() || formatWorkIngredients(input),
        ingredientGroups: normalizeIngredientGroups(input.ingredientGroups),
        id: createId(),
        createdAt,
        updatedAt: createdAt,
      }
      const nextItems = [record, ...this.items]
      writeRecords(nextItems)
      this.items = nextItems
      return record
    },
    remove(id: string) {
      const nextItems = this.items.filter((item) => item.id !== id)
      const deletedAt = new Date().toISOString()
      const deletedRecords = readDeletedRecords().filter((record) => record.id !== id)
      writeDeletedRecords([{ id, deletedAt }, ...deletedRecords])
      writeRecords(nextItems)
      this.items = nextItems
    },
    update(id: string, input: WorkRecordInput): WorkRecord | undefined {
      const existing = this.items.find((item) => item.id === id)
      if (!existing) return undefined

      const record: WorkRecord = {
        ...existing,
        ...input,
        ingredientsText: input.ingredientsText.trim() || formatWorkIngredients(input),
        ingredientGroups: normalizeIngredientGroups(input.ingredientGroups),
        updatedAt: new Date().toISOString(),
      }
      const nextItems = this.items.map((item) => (item.id === id ? record : item))
      writeRecords(nextItems)
      this.items = nextItems
      return record
    },
    importFromJson(json: string): WorkImportResult {
      const imported = importWorkRecords(json)
      const existingIds = new Set(this.items.map((item) => item.id))
      const nextRecords = imported.records.filter((item) => !existingIds.has(item.id))
      const nextItems = [...nextRecords, ...this.items]
      writeRecords(nextItems)
      this.items = nextItems
      return {
        importedCount: nextRecords.length,
        skippedCount: imported.skippedCount + imported.records.length - nextRecords.length,
      }
    },
    setCloudSync(status: WorkCloudSyncStatus, message: string) {
      this.cloudSync = {
        status,
        message,
        updatedAt: new Date().toISOString(),
      }
    },
    setAutoBackupEnabled(enabled: boolean) {
      this.autoBackup = {
        ...this.autoBackup,
        enabled,
      }
      writeAutoBackupState(this.autoBackup)
    },
    markCloudBackupSuccess(timestamp = new Date().toISOString()) {
      this.autoBackup = {
        ...this.autoBackup,
        lastBackupAt: timestamp,
      }
      writeAutoBackupState(this.autoBackup)
    },
    shouldPromptAutoCloudBackup(now = new Date()) {
      if (!this.autoBackup.enabled) return false
      if (!this.cloudAccount.accountName) return false
      if (!hasLocalBackupSourceData(this.items, this.autoBackup)) return false

      const lastBackupTime = Date.parse(this.autoBackup.lastBackupAt)
      if (!Number.isFinite(lastBackupTime)) return true
      return now.getTime() - lastBackupTime >= autoBackupIntervalMs
    },
    async loginCloudAccount(accountName: string, password: string) {
      this.setCloudSync('syncing', '正在登录 CloudBase 云端账号...')
      try {
        const session = await loginCloudWorksAccount(accountName, password)
        this.cloudAccount = {
          accountName: session.accountName,
          updatedAt: session.updatedAt,
        }
        this.setCloudSync('success', `已登录云端账号「${session.accountName}」。`)
        return session
      } catch (error) {
        this.setCloudSync(
          'error',
          getErrorMessage(error, '云端账号登录失败，请检查云函数地址和账号密码。'),
        )
        throw error
      }
    },
    logoutCloudAccount() {
      clearCloudWorksSession()
      this.cloudAccount = { accountName: '', updatedAt: '' }
      this.setCloudSync('idle', '已退出云端账号。')
    },
    async loadFromCloud(): Promise<number> {
      this.setCloudSync('syncing', '正在从 CloudBase 云端恢复账号数据...')
      try {
        const appData = await fetchCloudAppData()
        if (!hasRestorableAccountData(appData)) {
          this.setCloudSync('success', '云端目前没有账号数据，未恢复到本地。')
          return 0
        }

        applyAccountBackupData(appData)
        this.items = readRecords()
        this.autoBackup = appData.autoBackup
        writeAutoBackupState(this.autoBackup)
        this.setCloudSync(
          'success',
          `已从 CloudBase 云端恢复账号数据（作品 ${appData.works.length} 条）。`,
        )
        return appData.works.length
      } catch (error) {
        this.setCloudSync(
          'error',
          getErrorMessage(error, '读取云端失败，请确认 CloudBase 已开启身份认证和数据库。'),
        )
        throw error
      }
    },
    async pushAllToCloud(): Promise<number> {
      this.setCloudSync('syncing', '正在轻量同步账号数据到 CloudBase 云端...')
      try {
        const backupAt = new Date().toISOString()
        const patch = createAccountMetadataPatch(
          this.items,
          {
            ...this.autoBackup,
            lastBackupAt: backupAt,
          },
          backupAt,
        )
        await syncCloudMetadataPatch(patch)
        writeLastMetadataSyncAt(backupAt)
        writeDeletedRecords(readDeletedRecords().filter((record) => record.deletedAt > backupAt))
        this.markCloudBackupSuccess(backupAt)
        this.setCloudSync(
          'success',
          `已轻量同步账号数据到 CloudBase 云端（作品 ${this.items.length} 条，变更 ${patch.worksChanged.length + patch.worksDeleted.length} 条，不含照片）。`,
        )
        return this.items.length
      } catch (error) {
        this.setCloudSync(
          'error',
          getErrorMessage(error, '上传云端失败，请确认 CloudBase 已开启身份认证和数据库。'),
        )
        throw error
      }
    },
  },
})
