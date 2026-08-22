import { defineStore } from 'pinia'

import {
  activateCloudWorksAccount,
  clearCloudWorksSession,
  fetchCloudAppData,
  fetchCloudAppDataSnapshot,
  fetchCloudSnapshotSummary,
  getCloudWorksSession,
  previewCloudWorksAccount,
  replaceCloudWorksSession,
  syncCloudMetadataPatch,
} from '@/services/cloudWorks'
import type {
  CloudAccountPreview,
  CloudAccountDataSummary,
  CloudAppData,
  CloudDeletedWork,
  CloudMetadataPatch,
  CloudSnapshotSummary,
} from '@/services/cloudWorks'
import {
  cacheLegacyWorkPreview,
  cachePreparedWorkPhoto,
  getCachedWorkPreviewDataUrl,
  restoreAllWorkPreviews,
  uploadCachedWorkPhoto,
  type PreparedWorkPhoto,
  type WorkPhotoRestoreProgress,
} from '@/services/workPhotos'
import { clearAllWorkPhotos, deleteWorkPhotos, getWorkPhoto } from '@/services/workPhotoCache'
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
const restoreCheckpointStorageKeyPrefix = 'twilight_cloud_restore_checkpoint'
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
  photoOriginalObjectKey?: string
  photoPreviewObjectKey?: string
  photoOriginalName?: string
  photoOriginalMime?: string
  photoOriginalSize?: number
  photoRevision?: string
  photoBackupMode?: WorkPhotoBackupMode
}

export type WorkPhotoBackupMode = 'none' | 'preview-only' | 'original-and-preview'

export type WorkPhotoMetadata = {
  photoOriginalObjectKey: string
  photoPreviewObjectKey: string
  photoOriginalName: string
  photoOriginalMime: string
  photoOriginalSize: number
  photoRevision: string
  photoBackupMode: WorkPhotoBackupMode
}

export type WorkRecord = Omit<WorkRecordInput, keyof WorkPhotoMetadata> &
  WorkPhotoMetadata & {
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

export type WorkCloudSnapshotStatus = 'idle' | 'checking' | 'ready' | 'error'
export type WorkCloudSnapshotRelation = 'empty' | 'same-base' | 'cloud-changed' | 'unknown-base'

export type WorkCloudSnapshotState = {
  status: WorkCloudSnapshotStatus
  relation: WorkCloudSnapshotRelation
  checkedAt: string
  message: string
  snapshot: CloudSnapshotSummary | null
}

export type WorkCloudAccountState = {
  accountName: string
  updatedAt: string
}

export type WorkAutoBackupState = {
  enabled: boolean
  lastBackupAt: string
}

export type WorkPhotoRestoreState = WorkPhotoRestoreProgress & {
  status: 'idle' | 'restoring' | 'paused' | 'success' | 'error'
  message: string
}

export type CloudRestorePreview = {
  appData: CloudAppData
  snapshotId: string
  backupCreatedAt: string
  dataLastBackupAt: string
  localSummary: CloudAccountDataSummary
  cloudSummary: CloudAccountDataSummary
}

type CloudRestoreCheckpoint = {
  accountName: string
  accountNameKey: string
  createdAt: string
  appData: CloudAppData
  deletedRecords: CloudDeletedWork[]
  lastMetadataSyncAt: string
}

const createCloudSyncState = (): WorkCloudSyncState => ({
  status: 'idle',
  message: '尚未执行云端操作。',
  updatedAt: '',
})

const createCloudSnapshotState = (): WorkCloudSnapshotState => ({
  status: 'idle',
  relation: 'empty',
  checkedAt: '',
  message: '尚未检查云端。',
  snapshot: null,
})

const createPhotoRestoreState = (): WorkPhotoRestoreState => ({
  status: 'idle',
  completed: 0,
  total: 0,
  failedWorkIds: [],
  message: '尚未恢复云端照片。',
})

let photoRestoreController: AbortController | undefined

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

const restoreCheckpointStorageKey = () => {
  const session = getCloudWorksSession()
  return session ? `${restoreCheckpointStorageKeyPrefix}:${session.accountNameKey}` : ''
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

export class CloudBackupConflictError extends Error {
  override name = 'CloudBackupConflictError'
}

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
    photoOriginalObjectKey:
      typeof candidate.photoOriginalObjectKey === 'string' ? candidate.photoOriginalObjectKey : '',
    photoPreviewObjectKey:
      typeof candidate.photoPreviewObjectKey === 'string' ? candidate.photoPreviewObjectKey : '',
    photoOriginalName:
      typeof candidate.photoOriginalName === 'string' ? candidate.photoOriginalName : '',
    photoOriginalMime:
      typeof candidate.photoOriginalMime === 'string' ? candidate.photoOriginalMime : '',
    photoOriginalSize:
      typeof candidate.photoOriginalSize === 'number'
        ? Math.max(0, candidate.photoOriginalSize)
        : 0,
    photoRevision: typeof candidate.photoRevision === 'string' ? candidate.photoRevision : '',
    photoBackupMode:
      candidate.photoBackupMode === 'preview-only' ||
      candidate.photoBackupMode === 'original-and-preview'
        ? candidate.photoBackupMode
        : 'none',
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
  window.localStorage.setItem(
    storageKey,
    JSON.stringify(
      records.map((record) => (record.photoRevision ? { ...record, photoDataUrl: '' } : record)),
    ),
  )
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

const readRestoreCheckpoint = (): CloudRestoreCheckpoint | null => {
  const session = getCloudWorksSession()
  const key = restoreCheckpointStorageKey()
  if (!session || !key) return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const checkpoint = JSON.parse(raw) as Partial<CloudRestoreCheckpoint>
    if (
      checkpoint.accountNameKey !== session.accountNameKey ||
      typeof checkpoint.accountName !== 'string' ||
      typeof checkpoint.createdAt !== 'string' ||
      typeof checkpoint.lastMetadataSyncAt !== 'string' ||
      !checkpoint.appData ||
      checkpoint.appData.type !== 'app-data' ||
      !Array.isArray(checkpoint.deletedRecords)
    ) {
      return null
    }
    return checkpoint as CloudRestoreCheckpoint
  } catch {
    return null
  }
}

const writeRestoreCheckpoint = (checkpoint: CloudRestoreCheckpoint) => {
  const key = restoreCheckpointStorageKey()
  if (!key) throw new Error('请先登录云端账号，再创建本地恢复点。')
  const appData = {
    ...checkpoint.appData,
    works: checkpoint.appData.works.map((record) => ({
      ...record,
      photoDataUrl: record.photoRevision ? '' : record.photoDataUrl,
    })),
  }
  try {
    window.localStorage.setItem(key, JSON.stringify({ ...checkpoint, appData }))
  } catch {
    throw new Error('无法创建本地恢复点，已停止恢复；请先导出 JSON 或释放浏览器空间。')
  }
}

const clearRestoreCheckpoint = () => {
  const key = restoreCheckpointStorageKey()
  if (key) window.localStorage.removeItem(key)
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

export const summarizeAccountData = (appData: CloudAppData): CloudAccountDataSummary => ({
  works: appData.works.length,
  previewPhotos: appData.works.filter((record) => record.photoPreviewObjectKey).length,
  originalPhotos: appData.works.filter((record) => record.photoOriginalObjectKey).length,
  pantry: appData.pantry.ingredientSlugs.length,
  favorites: appData.favorites.cocktailSlugs.length,
  academy: appData.academy.completedSlugs.length,
  dailyPick: Number(
    Boolean(
      appData.dailyPick.selectedSlug ||
      appData.dailyPick.selectedDate ||
      appData.dailyPick.reason ||
      appData.dailyPick.rerollCount,
    ),
  ),
  customCocktails: appData.customOptions.cocktails.length,
  customFlavorLiquors: appData.customOptions.flavorLiquors.length,
  customBeverages: appData.customOptions.beverages.length,
})

const summarizeLocalAccountData = async (
  appData: CloudAppData,
): Promise<CloudAccountDataSummary> => {
  const summary = summarizeAccountData(appData)
  const localPhotos = await Promise.all(
    appData.works.map(async (record) => {
      if (!record.photoRevision) {
        return { preview: Boolean(record.photoDataUrl), original: false }
      }
      const [preview, original] = await Promise.all([
        getWorkPhoto(record.id, record.photoRevision, 'preview').catch(() => undefined),
        getWorkPhoto(record.id, record.photoRevision, 'original').catch(() => undefined),
      ])
      return {
        preview: Boolean(record.photoDataUrl || preview),
        original: Boolean(original),
      }
    }),
  )
  return {
    ...summary,
    previewPhotos: localPhotos.filter((photo) => photo.preview).length,
    originalPhotos: localPhotos.filter((photo) => photo.original).length,
  }
}

const hasCloudSnapshotData = (snapshot: CloudSnapshotSummary) =>
  snapshot.status === 'matched' &&
  (Boolean(snapshot.snapshotId || snapshot.dataLastBackupAt) ||
    Object.values(snapshot.summary).some((count) => count > 0))

const cloudSnapshotRelation = (
  snapshot: CloudSnapshotSummary,
  localLastBackupAt: string,
): WorkCloudSnapshotRelation => {
  if (!hasCloudSnapshotData(snapshot)) return 'empty'
  if (!localLastBackupAt) return 'unknown-base'
  return snapshot.dataLastBackupAt === localLastBackupAt ? 'same-base' : 'cloud-changed'
}

const cloudSnapshotMessage = (relation: WorkCloudSnapshotRelation) => {
  if (relation === 'empty') return '云端账号目前没有备份数据。'
  if (relation === 'same-base') return '已检查云端，本机基于当前云端备份。'
  if (relation === 'cloud-changed') return '云端已有其他设备更新的备份，请先查看后再操作。'
  return '已发现云端备份，但本机没有可验证的同步基线。'
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

const applyAccountBackupData = (
  appData: CloudAppData,
  options: { preserveLocalPhotos?: boolean } = { preserveLocalPhotos: true },
) => {
  const pantry = usePantryStore()
  const favorites = useFavoriteStore()
  const academy = useAcademyStore()
  const daily = useDailyPickStore()
  const localRecordsById = options.preserveLocalPhotos
    ? new Map(readRecords().map((record) => [record.id, record]))
    : new Map<string, WorkRecord>()
  const restoredWorks = appData.works.map((record) => {
    const localRecord = localRecordsById.get(record.id)
    const canReuseLocalPreview = Boolean(
      record.photoRevision &&
      record.photoRevision === localRecord?.photoRevision &&
      record.photoPreviewObjectKey &&
      record.photoPreviewObjectKey === localRecord?.photoPreviewObjectKey,
    )
    return normalizeRecord({
      ...record,
      photoDataUrl:
        record.photoDataUrl || (canReuseLocalPreview ? localRecord?.photoDataUrl || '' : ''),
    })
  })

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
    cloudSnapshot: createCloudSnapshotState(),
    cloudAccount: createCloudAccountState(),
    autoBackup: createAutoBackupState(),
    photoRestore: createPhotoRestoreState(),
    restoreCheckpointAvailable: Boolean(readRestoreCheckpoint()),
  }),
  getters: {
    hasRestoreCheckpoint: (state) => state.restoreCheckpointAvailable,
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
        photoOriginalObjectKey: input.photoOriginalObjectKey || '',
        photoPreviewObjectKey: input.photoPreviewObjectKey || '',
        photoOriginalName: input.photoOriginalName || '',
        photoOriginalMime: input.photoOriginalMime || '',
        photoOriginalSize: Math.max(0, input.photoOriginalSize || 0),
        photoRevision: input.photoRevision || '',
        photoBackupMode: input.photoBackupMode || 'none',
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
      void deleteWorkPhotos(id)
    },
    update(id: string, input: WorkRecordInput): WorkRecord | undefined {
      const existing = this.items.find((item) => item.id === id)
      if (!existing) return undefined

      const record: WorkRecord = {
        ...existing,
        ...input,
        photoOriginalObjectKey: input.photoOriginalObjectKey ?? existing.photoOriginalObjectKey,
        photoPreviewObjectKey: input.photoPreviewObjectKey ?? existing.photoPreviewObjectKey,
        photoOriginalName: input.photoOriginalName ?? existing.photoOriginalName,
        photoOriginalMime: input.photoOriginalMime ?? existing.photoOriginalMime,
        photoOriginalSize: input.photoOriginalSize ?? existing.photoOriginalSize,
        photoRevision: input.photoRevision ?? existing.photoRevision,
        photoBackupMode: input.photoBackupMode ?? existing.photoBackupMode,
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
    async refreshCloudSnapshot() {
      const session = getCloudWorksSession()
      const previousState =
        this.cloudSnapshot.snapshot?.accountName === session?.accountName
          ? this.cloudSnapshot
          : createCloudSnapshotState()
      this.cloudSnapshot = {
        ...previousState,
        status: 'checking',
        message: '正在检查云端备份...',
      }
      try {
        const snapshot = await fetchCloudSnapshotSummary()
        if (getCloudWorksSession()?.accountNameKey !== session?.accountNameKey) {
          throw new Error('云端账号已切换，本次查询结果已忽略。')
        }
        const relation = cloudSnapshotRelation(snapshot, this.autoBackup.lastBackupAt)
        this.cloudSnapshot = {
          status: 'ready',
          relation,
          checkedAt: new Date().toISOString(),
          message: cloudSnapshotMessage(relation),
          snapshot,
        }
        return snapshot
      } catch (error) {
        if (getCloudWorksSession()?.accountNameKey !== session?.accountNameKey) throw error
        this.cloudSnapshot = {
          ...previousState,
          status: 'error',
          message: getErrorMessage(error, '检查云端备份失败，请稍后重试。'),
        }
        throw error
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
    async attachPreparedPhoto(id: string, photo: PreparedWorkPhoto) {
      const existing = this.items.find((item) => item.id === id)
      if (!existing) throw new Error('没有找到要保存照片的作品。')
      await cachePreparedWorkPhoto(id, photo)
      const pendingRecord: WorkRecord = {
        ...existing,
        photoDataUrl: photo.previewDataUrl,
        photoOriginalObjectKey: '',
        photoPreviewObjectKey: '',
        photoOriginalName: photo.original.name,
        photoOriginalMime: photo.original.type,
        photoOriginalSize: photo.original.size,
        photoRevision: photo.revision,
        photoBackupMode: 'none',
        updatedAt: new Date().toISOString(),
      }
      this.items = this.items.map((item) => (item.id === id ? pendingRecord : item))
      writeRecords(this.items)
      return this.items.find((item) => item.id === id) as WorkRecord
    },
    async removeWorkPhoto(id: string) {
      const existing = this.items.find((item) => item.id === id)
      if (!existing) return
      const updated: WorkRecord = {
        ...existing,
        photoDataUrl: '',
        photoOriginalObjectKey: '',
        photoPreviewObjectKey: '',
        photoOriginalName: '',
        photoOriginalMime: '',
        photoOriginalSize: 0,
        photoRevision: '',
        photoBackupMode: 'none',
        updatedAt: new Date().toISOString(),
      }
      this.items = this.items.map((item) => (item.id === id ? updated : item))
      writeRecords(this.items)
      await deleteWorkPhotos(id)
    },
    async syncWorkPhoto(id: string) {
      const existing = this.items.find((item) => item.id === id)
      if (!existing?.photoRevision) throw new Error('这条作品没有待上传的照片。')
      const metadata = await uploadCachedWorkPhoto(id, existing.photoRevision)
      const updated: WorkRecord = {
        ...existing,
        ...metadata,
        updatedAt: new Date().toISOString(),
      }
      this.items = this.items.map((item) => (item.id === id ? updated : item))
      writeRecords(this.items)
      return updated
    },
    async migrateLegacyPhotoBackups() {
      const legacyRecords = this.items.filter(
        (item) => item.photoDataUrl && !item.photoRevision && !item.photoPreviewObjectKey,
      )
      for (const record of legacyRecords) {
        try {
          const revision = await cacheLegacyWorkPreview(record.id, record.photoDataUrl)
          const pending: WorkRecord = {
            ...record,
            photoRevision: revision,
            photoBackupMode: 'none',
            updatedAt: new Date().toISOString(),
          }
          this.items = this.items.map((item) => (item.id === record.id ? pending : item))
          writeRecords(this.items)
          await this.syncWorkPhoto(record.id)
        } catch {
          // Keep unreadable legacy data URLs local instead of blocking all metadata backups.
        }
      }
    },
    async syncPendingWorkPhotos() {
      const pending = this.items.filter((item) => item.photoRevision && !item.photoPreviewObjectKey)
      for (const record of pending) await this.syncWorkPhoto(record.id)
    },
    pausePhotoRestore() {
      photoRestoreController?.abort()
      if (this.photoRestore.status === 'restoring') {
        this.photoRestore = {
          ...this.photoRestore,
          status: 'paused',
          message: `照片恢复已暂停（${this.photoRestore.completed}/${this.photoRestore.total}）。`,
        }
      }
    },
    async restorePhotoPreviews() {
      photoRestoreController?.abort()
      photoRestoreController = new AbortController()
      const controller = photoRestoreController
      this.photoRestore = {
        status: 'restoring',
        completed: 0,
        total: 0,
        failedWorkIds: [],
        message: '正在恢复全部作品预览图...',
      }
      try {
        const result = await restoreAllWorkPreviews(this.items, {
          signal: controller.signal,
          onProgress: (progress) => {
            this.photoRestore = {
              ...progress,
              status: controller.signal.aborted ? 'paused' : 'restoring',
              message: `正在恢复全部作品预览图（${progress.completed}/${progress.total}）...`,
            }
          },
        })
        if (controller.signal.aborted) return result

        const dataUrls = await Promise.all(
          this.items.map((item) =>
            item.photoRevision
              ? getCachedWorkPreviewDataUrl(item.id, item.photoRevision)
              : Promise.resolve(item.photoDataUrl),
          ),
        )
        this.items = this.items.map((item, index) => ({
          ...item,
          photoDataUrl: dataUrls[index] || item.photoDataUrl,
        }))
        this.photoRestore = {
          ...result,
          status: result.failedWorkIds.length ? 'error' : 'success',
          message: result.failedWorkIds.length
            ? `已恢复 ${result.completed - result.failedWorkIds.length}/${result.total} 张预览图，${result.failedWorkIds.length} 张失败，可重试。`
            : `已恢复全部 ${result.total} 张作品预览图。`,
        }
        return result
      } catch (error) {
        this.photoRestore = {
          ...this.photoRestore,
          status: 'error',
          message: getErrorMessage(error, '照片恢复失败，请稍后重试。'),
        }
        throw error
      }
    },
    async previewCloudAccount(accountName: string, password: string) {
      this.setCloudSync('syncing', '正在检查 CloudBase 云端账号数据...')
      try {
        const preview = await previewCloudWorksAccount(accountName, password)
        this.setCloudSync(
          'success',
          preview.status === 'new'
            ? `云端账号「${preview.session.accountName}」尚无数据，确认后将清空当前本地账号数据。`
            : `已检查云端账号「${preview.session.accountName}」（作品 ${preview.recordCount} 条），等待确认覆盖本地。`,
        )
        return preview
      } catch (error) {
        this.setCloudSync(
          'error',
          getErrorMessage(error, '云端账号登录失败，请检查云函数地址和账号密码。'),
        )
        throw error
      }
    },
    async activateCloudAccount(preview: CloudAccountPreview): Promise<number> {
      const previousSession = getCloudWorksSession()
      const previousAppData = createAccountBackupData(this.items, this.autoBackup)
      const previousDeletedRecords = readDeletedRecords()
      this.setCloudSync('syncing', `正在切换到云端账号「${preview.session.accountName}」...`)

      try {
        const session = await activateCloudWorksAccount(preview)
        applyAccountBackupData(preview.appData, { preserveLocalPhotos: false })
        this.items = readRecords()
        this.autoBackup = { ...preview.appData.autoBackup }
        writeAutoBackupState(this.autoBackup)
        writeDeletedRecords([])
        this.cloudAccount = {
          accountName: session.accountName,
          updatedAt: session.updatedAt,
        }
        this.cloudSnapshot = createCloudSnapshotState()
        this.restoreCheckpointAvailable = Boolean(readRestoreCheckpoint())
      } catch (error) {
        try {
          applyAccountBackupData(previousAppData, { preserveLocalPhotos: false })
          this.items = readRecords()
          this.autoBackup = { ...previousAppData.autoBackup }
          writeAutoBackupState(this.autoBackup)
          writeDeletedRecords(previousDeletedRecords)
          replaceCloudWorksSession(previousSession)
          this.cloudAccount = {
            accountName: previousSession?.accountName ?? '',
            updatedAt: previousSession?.updatedAt ?? '',
          }
        } catch {
          // Keep the original switching error visible if local rollback also fails.
        }
        this.setCloudSync('error', getErrorMessage(error, '切换云端账号失败，本地数据未被替换。'))
        throw error
      }

      try {
        await clearAllWorkPhotos()
        await this.restorePhotoPreviews()
        this.setCloudSync(
          'success',
          `已切换到云端账号「${preview.session.accountName}」，并覆盖本地账号数据（作品 ${this.items.length} 条）。`,
        )
      } catch (error) {
        this.setCloudSync(
          'error',
          `已切换到云端账号「${preview.session.accountName}」，但照片恢复失败，可稍后重试：${getErrorMessage(error, '未知错误')}`,
        )
      }
      return this.items.length
    },
    async loginCloudAccount(accountName: string, password: string) {
      const preview = await this.previewCloudAccount(accountName, password)
      await this.activateCloudAccount(preview)
      return preview.session
    },
    logoutCloudAccount() {
      clearCloudWorksSession()
      this.cloudAccount = { accountName: '', updatedAt: '' }
      this.cloudSnapshot = createCloudSnapshotState()
      this.restoreCheckpointAvailable = false
      this.setCloudSync('idle', '已退出云端账号。')
    },
    async prepareCloudRestore(): Promise<CloudRestorePreview> {
      this.setCloudSync('syncing', '正在读取云端备份详情...')
      try {
        const remote = await fetchCloudAppDataSnapshot()
        const preview = {
          appData: remote.appData,
          snapshotId: remote.snapshotId,
          backupCreatedAt: remote.backupCreatedAt,
          dataLastBackupAt: remote.appData.autoBackup.lastBackupAt,
          localSummary: await summarizeLocalAccountData(
            createAccountBackupData(this.items, this.autoBackup),
          ),
          cloudSummary: summarizeAccountData(remote.appData),
        }
        this.setCloudSync('success', '已读取云端备份详情，等待确认恢复。')
        return preview
      } catch (error) {
        this.setCloudSync('error', getErrorMessage(error, '读取云端备份详情失败，请稍后重试。'))
        throw error
      }
    },
    async restorePreparedCloudData(preview: CloudRestorePreview): Promise<number> {
      this.setCloudSync('syncing', '正在验证并恢复 CloudBase 云端账号数据...')
      try {
        const currentSnapshot = await fetchCloudSnapshotSummary()
        if (currentSnapshot.snapshotId !== preview.snapshotId) {
          throw new Error('云端备份在确认期间发生了变化，请重新检查后再恢复。')
        }

        const session = getCloudWorksSession()
        if (!session) throw new Error('请先登录云端账号。')
        const previousAppData = createAccountBackupData(this.items, this.autoBackup)
        const previousDeletedRecords = readDeletedRecords()
        const previousLastMetadataSyncAt = readLastMetadataSyncAt()
        const checkpoint: CloudRestoreCheckpoint = {
          accountName: session.accountName,
          accountNameKey: session.accountNameKey,
          createdAt: new Date().toISOString(),
          appData: previousAppData,
          deletedRecords: previousDeletedRecords,
          lastMetadataSyncAt: previousLastMetadataSyncAt,
        }
        writeRestoreCheckpoint(checkpoint)

        try {
          applyAccountBackupData(preview.appData)
          this.items = readRecords()
          this.autoBackup = { ...preview.appData.autoBackup }
          writeAutoBackupState(this.autoBackup)
          writeDeletedRecords([])
          writeLastMetadataSyncAt(new Date().toISOString())
          this.restoreCheckpointAvailable = true
        } catch (error) {
          applyAccountBackupData(previousAppData)
          this.items = readRecords()
          this.autoBackup = { ...previousAppData.autoBackup }
          writeAutoBackupState(this.autoBackup)
          writeDeletedRecords(previousDeletedRecords)
          writeLastMetadataSyncAt(previousLastMetadataSyncAt)
          clearRestoreCheckpoint()
          this.restoreCheckpointAvailable = false
          throw error
        }

        this.cloudSnapshot = {
          status: 'ready',
          relation: 'same-base',
          checkedAt: new Date().toISOString(),
          message: '已从当前云端备份恢复，本机与云端版本一致。',
          snapshot: currentSnapshot,
        }
        try {
          await this.restorePhotoPreviews()
          this.setCloudSync(
            'success',
            `已从 CloudBase 云端恢复账号数据（作品 ${preview.appData.works.length} 条），可撤销本次恢复。`,
          )
        } catch (error) {
          this.setCloudSync(
            'error',
            `账号数据已恢复，但部分照片恢复失败，可重试或撤销：${getErrorMessage(error, '未知错误')}`,
          )
        }
        return this.items.length
      } catch (error) {
        this.setCloudSync(
          'error',
          getErrorMessage(error, '恢复云端账号数据失败，本地数据未被替换。'),
        )
        throw error
      }
    },
    async undoLastCloudRestore(): Promise<number> {
      const checkpoint = readRestoreCheckpoint()
      if (!checkpoint) throw new Error('当前账号没有可撤销的云端恢复记录。')
      const currentAppData = createAccountBackupData(this.items, this.autoBackup)
      const currentDeletedRecords = readDeletedRecords()
      const currentLastMetadataSyncAt = readLastMetadataSyncAt()
      this.setCloudSync('syncing', '正在撤销上一次云端恢复...')
      try {
        applyAccountBackupData(checkpoint.appData)
        this.items = readRecords()
        this.autoBackup = { ...checkpoint.appData.autoBackup }
        writeAutoBackupState(this.autoBackup)
        writeDeletedRecords(checkpoint.deletedRecords)
        writeLastMetadataSyncAt(checkpoint.lastMetadataSyncAt)
      } catch (error) {
        applyAccountBackupData(currentAppData)
        this.items = readRecords()
        this.autoBackup = { ...currentAppData.autoBackup }
        writeAutoBackupState(this.autoBackup)
        writeDeletedRecords(currentDeletedRecords)
        writeLastMetadataSyncAt(currentLastMetadataSyncAt)
        this.setCloudSync('error', getErrorMessage(error, '撤销恢复失败，本地数据未改变。'))
        throw error
      }

      clearRestoreCheckpoint()
      this.restoreCheckpointAvailable = false
      if (this.cloudSnapshot.snapshot) {
        const relation = cloudSnapshotRelation(
          this.cloudSnapshot.snapshot,
          this.autoBackup.lastBackupAt,
        )
        this.cloudSnapshot = {
          ...this.cloudSnapshot,
          status: 'ready',
          relation,
          message: cloudSnapshotMessage(relation),
        }
      }
      try {
        await this.restorePhotoPreviews()
      } catch {
        // Account metadata is already restored; the existing photo retry panel remains available.
      }
      this.setCloudSync('success', '已撤销上一次云端恢复，恢复前的本地账号数据已还原。')
      return this.items.length
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
        await this.restorePhotoPreviews()
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
        await this.refreshCloudSnapshot()
        if (
          this.cloudSnapshot.relation === 'cloud-changed' ||
          this.cloudSnapshot.relation === 'unknown-base'
        ) {
          throw new CloudBackupConflictError(
            '检测到云端已有较新备份，请先检查并恢复云端数据，避免覆盖其他设备的更新。',
          )
        }
        await this.migrateLegacyPhotoBackups()
        await this.syncPendingWorkPhotos()
        const backupAt = new Date().toISOString()
        const patch = createAccountMetadataPatch(
          this.items,
          {
            ...this.autoBackup,
            lastBackupAt: backupAt,
          },
          backupAt,
        )
        const syncResult = await syncCloudMetadataPatch(
          patch,
          this.cloudSnapshot.snapshot?.snapshotId || '',
        )
        writeLastMetadataSyncAt(backupAt)
        writeDeletedRecords(readDeletedRecords().filter((record) => record.deletedAt > backupAt))
        this.markCloudBackupSuccess(backupAt)
        const uploadedAppData = createAccountBackupData(this.items, this.autoBackup)
        this.cloudSnapshot = {
          status: 'ready',
          relation: 'same-base',
          checkedAt: new Date().toISOString(),
          message: '云端备份已更新，本机与云端版本一致。',
          snapshot: {
            status: 'matched',
            accountName: this.cloudAccount.accountName,
            snapshotId: syncResult.snapshotId,
            backupCreatedAt: syncResult.snapshotId,
            dataLastBackupAt: backupAt,
            recordCount: syncResult.recordCount,
            summary: summarizeAccountData(uploadedAppData),
          },
        }
        this.setCloudSync(
          'success',
          `已同步账号数据到 CloudBase 云端（作品 ${this.items.length} 条，变更 ${patch.worksChanged.length + patch.worksDeleted.length} 条，照片使用 OSS 备份）。`,
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
