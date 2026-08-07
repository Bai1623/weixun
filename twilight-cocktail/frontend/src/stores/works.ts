import { defineStore } from 'pinia'

import {
  clearCloudWorksSession,
  fetchCloudWorks,
  getCloudWorksSession,
  loginCloudWorksAccount,
  syncCloudWorks,
} from '@/services/cloudWorks'

const storageKey = 'cocktail_work_records'
const autoBackupStorageKey = 'cocktail_work_auto_backup'
const autoBackupIntervalMs = 24 * 60 * 60 * 1000

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

const writeAutoBackupState = (state: WorkAutoBackupState) => {
  window.localStorage.setItem(autoBackupStorageKey, JSON.stringify(state))
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
      const record: WorkRecord = {
        ...input,
        ingredientsText: input.ingredientsText.trim() || formatWorkIngredients(input),
        ingredientGroups: normalizeIngredientGroups(input.ingredientGroups),
        id: createId(),
        createdAt: new Date().toISOString(),
      }
      const nextItems = [record, ...this.items]
      writeRecords(nextItems)
      this.items = nextItems
      return record
    },
    remove(id: string) {
      const nextItems = this.items.filter((item) => item.id !== id)
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
    markCloudBackupSuccess() {
      this.autoBackup = {
        ...this.autoBackup,
        lastBackupAt: new Date().toISOString(),
      }
      writeAutoBackupState(this.autoBackup)
    },
    shouldPromptAutoCloudBackup(now = new Date()) {
      if (!this.autoBackup.enabled) return false
      if (!this.cloudAccount.accountName) return false
      if (!this.totalCount) return false

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
      this.setCloudSync('syncing', '正在从 CloudBase 云端恢复作品...')
      try {
        const records = await fetchCloudWorks()
        if (!records.length) {
          this.setCloudSync('success', '云端目前没有作品，未恢复到本地。')
          return 0
        }

        writeRecords(records)
        this.items = records
        this.setCloudSync('success', `已从 CloudBase 云端恢复 ${records.length} 条作品。`)
        return records.length
      } catch (error) {
        this.setCloudSync(
          'error',
          getErrorMessage(error, '读取云端失败，请确认 CloudBase 已开启身份认证和数据库。'),
        )
        throw error
      }
    },
    async pushAllToCloud(): Promise<number> {
      this.setCloudSync('syncing', '正在上传作品到 CloudBase 云端...')
      try {
        await syncCloudWorks(this.items)
        this.markCloudBackupSuccess()
        this.setCloudSync('success', `已上传 ${this.items.length} 条作品到 CloudBase 云端。`)
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
