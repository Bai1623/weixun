import type { WorkIngredientGroups, WorkRecord } from '@/stores/works'

export const CLOUD_WORKS_COLLECTION = 'works'
const defaultCloudWorksApiUrl =
  'https://bai-d0g23uiiz96a4f50d-1428838698.ap-shanghai.app.tcloudbase.com/share'
const cloudWorksApiUrl = import.meta.env.VITE_CLOUDBASE_WORKS_API_URL || defaultCloudWorksApiUrl
const cloudSessionStorageKey = 'twilight_cloud_works_session'
const defaultUploadChunkBytes = 24 * 1024

export type CloudWorksSession = {
  accountName: string
  accountNameKey: string
  passwordVerifier: string
  updatedAt: string
}

export type CloudAccountPreview = {
  session: CloudWorksSession
  status: 'matched' | 'new'
  appData: CloudAppData
  recordCount: number
}

type CloudWorksPayload = {
  version: 1
  app: 'twilight-mixbook'
  type: 'work-records'
  records: WorkRecord[]
}

export type CloudDailyPickData = {
  selectedSlug: string
  selectedDate: string
  reason: string
  rerollCount: number
}

export type CloudCustomWorkCocktailOption = {
  value: string
  slug: string
  nameZh: string
  nameEn: string
  ingredientsText?: string
  ingredientGroups?: WorkIngredientGroups
  isCustom: boolean
  createdAt: string
}

export type CloudAppData = {
  version: 1
  app: 'twilight-mixbook'
  type: 'app-data'
  works: WorkRecord[]
  pantry: {
    ingredientSlugs: string[]
  }
  favorites: {
    cocktailSlugs: string[]
  }
  academy: {
    completedSlugs: string[]
  }
  dailyPick: CloudDailyPickData
  customOptions: {
    cocktails: CloudCustomWorkCocktailOption[]
    flavorLiquors: string[]
    beverages: string[]
  }
  autoBackup: {
    enabled: boolean
    lastBackupAt: string
  }
}

export type CloudDeletedWork = {
  id: string
  deletedAt: string
}

export type CloudMetadataPatch = {
  version: 1
  app: 'twilight-mixbook'
  type: 'metadata-patch'
  changedAt: string
  worksChanged: WorkRecord[]
  worksDeleted: CloudDeletedWork[]
  pantry: CloudAppData['pantry']
  favorites: CloudAppData['favorites']
  academy: CloudAppData['academy']
  dailyPick: CloudAppData['dailyPick']
  customOptions: CloudAppData['customOptions']
  autoBackup: CloudAppData['autoBackup']
}

export type CloudPhotoBackupMode = 'preview-only' | 'original-and-preview'

export type CloudPhotoFileDescriptor = {
  name?: string
  type: string
  size: number
}

export type CloudPhotoUploadInput = {
  workId: string
  photoRevision: string
  mode: CloudPhotoBackupMode
  original?: CloudPhotoFileDescriptor
  preview: CloudPhotoFileDescriptor
}

export type CloudPhotoSignedUpload = {
  objectKey: string
  url: string
  method: 'PUT'
  contentType: string
  expiresAt: string
}

export type CloudPhotoUploadPreparation = {
  mode: CloudPhotoBackupMode
  photoRevision: string
  original?: CloudPhotoSignedUpload
  preview: CloudPhotoSignedUpload
  expiresAt: string
}

export type CloudPhotoDownload = {
  workId: string
  objectKey: string
  url: string
  method: 'GET'
  expiresAt: string
}

type CloudWorksResponse = {
  ok?: boolean
  status?: string
  error?: string
  message?: string
  accountName?: string
  recordCount?: number
  chunkCount?: number
  chunkIndex?: number
  uploadId?: string
  payload?: unknown
  payloadText?: string
  payloadType?: string
  mode?: string
  photoRevision?: string
  expiresAt?: string
  original?: unknown
  preview?: unknown
  downloads?: unknown
}

type CloudWorkDocument = {
  _id?: string
  ownerId?: string
  madeAt?: string
  cocktailSlug?: string
  cocktailName?: string
  photoDataUrl?: string
  photoFileId?: string
  photoOriginalObjectKey?: string
  photoPreviewObjectKey?: string
  photoOriginalName?: string
  photoOriginalMime?: string
  photoOriginalSize?: number
  photoRevision?: string
  photoBackupMode?: 'none' | 'preview-only' | 'original-and-preview'
  ingredientsText?: string
  ingredientGroups?: WorkIngredientGroups
  rating?: number
  mood?: string
  selfReview?: string
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export const getCloudWorksApiUrl = () => cloudWorksApiUrl

const normalizeAccountName = (accountName: string) => accountName.trim().toLowerCase()

const hashText = async (value: string) => {
  if (globalThis.crypto?.subtle) {
    const buffer = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
    return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('')
  }
  return btoa(unescape(encodeURIComponent(value)))
}

export const buildCloudWorksIdentity = async (accountName: string, password: string) => {
  const normalizedAccountName = normalizeAccountName(accountName)
  if (!normalizedAccountName) throw new Error('请输入云端账号。')
  if (!password.trim()) throw new Error('请输入云端密码。')

  return {
    accountName: accountName.trim(),
    accountNameKey: await hashText(`cloud-account-name:v1:${normalizedAccountName}`),
    passwordVerifier: await hashText(`cloud-account-password:${normalizedAccountName}:${password}`),
  }
}

const createPayload = (records: readonly WorkRecord[]): CloudWorksPayload => ({
  version: 1,
  app: 'twilight-mixbook',
  type: 'work-records',
  records: records.map((record) => ({ ...record })),
})

export const createEmptyCloudAppData = (): CloudAppData => ({
  version: 1,
  app: 'twilight-mixbook',
  type: 'app-data',
  works: [],
  pantry: { ingredientSlugs: [] },
  favorites: { cocktailSlugs: [] },
  academy: { completedSlugs: [] },
  dailyPick: {
    selectedSlug: '',
    selectedDate: '',
    reason: '',
    rerollCount: 0,
  },
  customOptions: {
    cocktails: [],
    flavorLiquors: [],
    beverages: [],
  },
  autoBackup: {
    enabled: false,
    lastBackupAt: '',
  },
})

const createAppDataPayload = (appData: CloudAppData): CloudAppData => normalizeCloudAppData(appData)

const createMetadataRecord = (record: WorkRecord): WorkRecord => ({
  ...record,
  photoDataUrl: '',
})

const createMetadataPatchPayload = (patch: CloudMetadataPatch): CloudMetadataPatch => ({
  ...patch,
  worksChanged: patch.worksChanged.map(createMetadataRecord),
})

const byteLength = (value: string) => new Blob([value]).size

const createTextChunks = (payloadText: string, maxChunkBytes = defaultUploadChunkBytes) => {
  const chunks: Array<{ payloadText: string }> = []
  let start = 0

  while (start < payloadText.length) {
    let end = Math.min(payloadText.length, start + maxChunkBytes)
    while (end > start && byteLength(payloadText.slice(start, end)) > maxChunkBytes) {
      end -= Math.min(1024, end - start)
    }
    if (end <= start) end = start + 1
    chunks.push({ payloadText: payloadText.slice(start, end) })
    start = end
  }

  if (!chunks.length) chunks.push({ payloadText })
  return chunks
}

export const createCloudWorkChunks = (
  records: readonly WorkRecord[],
  maxChunkBytes = defaultUploadChunkBytes,
) => {
  const payloadText = JSON.stringify(createPayload(records))
  return createTextChunks(payloadText, maxChunkBytes)
}

export const createCloudAppDataChunks = (
  appData: CloudAppData,
  maxChunkBytes = defaultUploadChunkBytes,
) => {
  const payloadText = JSON.stringify(createAppDataPayload(appData))
  return createTextChunks(payloadText, maxChunkBytes)
}

const readCloudSession = (): CloudWorksSession | null => {
  try {
    const raw = window.localStorage.getItem(cloudSessionStorageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CloudWorksSession>
    if (!parsed.accountName || !parsed.accountNameKey || !parsed.passwordVerifier) return null
    return {
      accountName: parsed.accountName,
      accountNameKey: parsed.accountNameKey,
      passwordVerifier: parsed.passwordVerifier,
      updatedAt: parsed.updatedAt || '',
    }
  } catch {
    return null
  }
}

export const getCloudWorksSession = () => readCloudSession()

const saveCloudSession = (session: CloudWorksSession) => {
  window.localStorage.setItem(cloudSessionStorageKey, JSON.stringify(session))
}

export const clearCloudWorksSession = () => {
  window.localStorage.removeItem(cloudSessionStorageKey)
}

export const replaceCloudWorksSession = (session: CloudWorksSession | null) => {
  if (session) {
    saveCloudSession(session)
    return
  }
  clearCloudWorksSession()
}

const getRequiredCloudSession = () => {
  const session = readCloudSession()
  if (!session) throw new Error('请先在作品分享里登录云端账号。')
  return session
}

const postCloudWorksAction = async (body: Record<string, unknown>): Promise<CloudWorksResponse> => {
  if (!cloudWorksApiUrl) {
    throw new Error('请先配置 VITE_CLOUDBASE_WORKS_API_URL 云函数地址。')
  }

  let response: Response
  try {
    response = await fetch(cloudWorksApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        '无法连接云函数。若登录正常但同步失败，请重新部署新版 twilightWorks 云函数后再试。',
      )
    }
    throw error
  }
  const data = (await response.json().catch(() => ({}))) as CloudWorksResponse
  if (!response.ok || data.error) {
    const error = new Error(data.message || data.error || '云函数请求失败。')
    Object.assign(error, { status: response.status })
    throw error
  }
  if (data.status === 'password_mismatch') {
    throw new Error('云端账号密码不匹配。')
  }
  return data
}

const isRetryableCloudActionError = (error: unknown) => {
  const status = (error as { status?: unknown })?.status
  if (typeof status === 'number') {
    return status === 408 || status === 425 || status === 429 || status >= 500
  }
  return error instanceof Error && /无法连接云函数|network|timeout|timed out|temporary/i.test(error.message)
}

const postIdempotentCloudWorksAction = async (body: Record<string, unknown>) => {
  try {
    return await postCloudWorksAction(body)
  } catch (error) {
    if (!isRetryableCloudActionError(error)) throw error
    return postCloudWorksAction(body)
  }
}

export const previewCloudWorksAccount = async (
  accountName: string,
  password: string,
): Promise<CloudAccountPreview> => {
  const identity = await buildCloudWorksIdentity(accountName, password)
  const result = await postCloudWorksAction({
    action: 'account-login',
    ...identity,
  })

  const session: CloudWorksSession = {
    ...identity,
    updatedAt: new Date().toISOString(),
  }

  if (result.status === 'account_not_found') {
    return {
      session,
      status: 'new',
      appData: createEmptyCloudAppData(),
      recordCount: 0,
    }
  }

  const appData = await fetchCloudAppDataForSession(session)
  return {
    session,
    status: 'matched',
    appData,
    recordCount:
      typeof result.recordCount === 'number' && Number.isFinite(result.recordCount)
        ? Math.max(0, Math.floor(result.recordCount))
        : appData.works.length,
  }
}

export const activateCloudWorksAccount = async (preview: CloudAccountPreview) => {
  if (preview.status === 'new') {
    await postCloudWorksAction({
      action: 'account-create',
      accountName: preview.session.accountName,
      accountNameKey: preview.session.accountNameKey,
      passwordVerifier: preview.session.passwordVerifier,
    })
  }

  saveCloudSession(preview.session)
  return preview.session
}

export const loginCloudWorksAccount = async (accountName: string, password: string) => {
  const preview = await previewCloudWorksAccount(accountName, password)
  return activateCloudWorksAccount(preview)
}

const isIngredientGroups = (value: unknown): value is WorkIngredientGroups => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<WorkIngredientGroups>
  return (
    Array.isArray(candidate.baseLiquors) &&
    Array.isArray(candidate.flavorLiquors) &&
    Array.isArray(candidate.beverages) &&
    typeof candidate.other === 'string'
  )
}

const isWorkRecord = (value: unknown): value is WorkRecord => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<WorkRecord>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.madeAt === 'string' &&
    typeof candidate.cocktailName === 'string' &&
    typeof candidate.ingredientsText === 'string' &&
    typeof candidate.createdAt === 'string' &&
    (candidate.ingredientGroups === undefined || isIngredientGroups(candidate.ingredientGroups))
  )
}

const normalizeCloudRecords = (payload: unknown): WorkRecord[] => {
  if (!payload || typeof payload !== 'object') return []
  const records =
    (payload as { records?: unknown }).records ?? (payload as { works?: unknown }).works
  if (!Array.isArray(records)) return []
  return records.flatMap((item) => (isWorkRecord(item) ? [item] : []))
}

const safeStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? Array.from(new Set(value.filter((item): item is string => typeof item === 'string')))
    : []

const normalizeDailyPick = (value: unknown): CloudDailyPickData => {
  if (!value || typeof value !== 'object') return createEmptyCloudAppData().dailyPick
  const candidate = value as Partial<CloudDailyPickData>
  return {
    selectedSlug: typeof candidate.selectedSlug === 'string' ? candidate.selectedSlug : '',
    selectedDate: typeof candidate.selectedDate === 'string' ? candidate.selectedDate : '',
    reason: typeof candidate.reason === 'string' ? candidate.reason : '',
    rerollCount:
      typeof candidate.rerollCount === 'number' && Number.isFinite(candidate.rerollCount)
        ? Math.max(0, Math.floor(candidate.rerollCount))
        : 0,
  }
}

const isCloudCustomCocktailOption = (value: unknown): value is CloudCustomWorkCocktailOption => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<CloudCustomWorkCocktailOption>
  return (
    typeof candidate.value === 'string' &&
    typeof candidate.slug === 'string' &&
    typeof candidate.nameZh === 'string' &&
    typeof candidate.nameEn === 'string' &&
    typeof candidate.createdAt === 'string' &&
    (candidate.ingredientsText === undefined || typeof candidate.ingredientsText === 'string') &&
    (candidate.ingredientGroups === undefined || isIngredientGroups(candidate.ingredientGroups))
  )
}

const normalizeCustomCocktails = (value: unknown): CloudCustomWorkCocktailOption[] => {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) =>
    isCloudCustomCocktailOption(item)
      ? [
          {
            ...item,
            isCustom: true,
            ingredientsText: item.ingredientsText ?? '',
            ingredientGroups: item.ingredientGroups,
          },
        ]
      : [],
  )
}

const normalizeAutoBackup = (value: unknown): CloudAppData['autoBackup'] => {
  if (!value || typeof value !== 'object') return createEmptyCloudAppData().autoBackup
  const candidate = value as Partial<CloudAppData['autoBackup']>
  return {
    enabled: Boolean(candidate.enabled),
    lastBackupAt: typeof candidate.lastBackupAt === 'string' ? candidate.lastBackupAt : '',
  }
}

export const normalizeCloudAppData = (payload: unknown): CloudAppData => {
  const empty = createEmptyCloudAppData()
  if (!payload || typeof payload !== 'object') return empty

  const candidate = payload as Partial<CloudAppData> & {
    type?: string
    records?: unknown
  }
  const isAppData = candidate.type === 'app-data'
  return {
    ...empty,
    works: normalizeCloudRecords(isAppData ? candidate : payload),
    pantry: {
      ingredientSlugs: safeStringArray(candidate.pantry?.ingredientSlugs),
    },
    favorites: {
      cocktailSlugs: safeStringArray(candidate.favorites?.cocktailSlugs),
    },
    academy: {
      completedSlugs: safeStringArray(candidate.academy?.completedSlugs),
    },
    dailyPick: normalizeDailyPick(candidate.dailyPick),
    customOptions: {
      cocktails: normalizeCustomCocktails(candidate.customOptions?.cocktails),
      flavorLiquors: safeStringArray(candidate.customOptions?.flavorLiquors),
      beverages: safeStringArray(candidate.customOptions?.beverages),
    },
    autoBackup: normalizeAutoBackup(candidate.autoBackup),
  }
}

const fetchLegacyCloudAppData = async (session: CloudWorksSession) => {
  const result = await postCloudWorksAction({
    action: 'works-get',
    accountNameKey: session.accountNameKey,
    passwordVerifier: session.passwordVerifier,
  })
  return normalizeCloudAppData(result.payload)
}

const fetchCloudAppDataForSession = async (session: CloudWorksSession) => {
  const startResult = await postCloudWorksAction({
    action: 'works-get-start',
    accountNameKey: session.accountNameKey,
    passwordVerifier: session.passwordVerifier,
  })

  if (startResult.payload !== undefined) {
    return normalizeCloudAppData(startResult.payload)
  }

  const chunkCount =
    typeof startResult.chunkCount === 'number' && Number.isFinite(startResult.chunkCount)
      ? Math.max(0, Math.floor(startResult.chunkCount))
      : 0

  if (!chunkCount) {
    return fetchLegacyCloudAppData(session)
  }

  const textChunks: string[] = []
  const legacyPayloads: unknown[] = []
  for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex += 1) {
    const chunk = await postCloudWorksAction({
      action: 'works-get-chunk',
      accountNameKey: session.accountNameKey,
      passwordVerifier: session.passwordVerifier,
      chunkIndex,
    })

    if (typeof chunk.payloadText === 'string') {
      textChunks[chunkIndex] = chunk.payloadText
      continue
    }
    if (chunk.payload !== undefined) {
      legacyPayloads.push(chunk.payload)
      continue
    }
    throw new Error('云端备份分片缺失，请重新上传后再恢复。')
  }

  if (textChunks.length) {
    try {
      return normalizeCloudAppData(JSON.parse(textChunks.join('')))
    } catch {
      throw new Error('云端备份分片内容损坏，请重新上传后再恢复。')
    }
  }

  if (legacyPayloads.length === 1) {
    return normalizeCloudAppData(legacyPayloads[0])
  }

  return normalizeCloudAppData({
    version: 1,
    app: 'twilight-mixbook',
    type: 'work-records',
    records: legacyPayloads.flatMap((payload) => normalizeCloudRecords(payload)),
  })
}

export const fetchCloudAppData = async () =>
  fetchCloudAppDataForSession(getRequiredCloudSession())

export const fetchCloudWorks = async () => {
  const appData = await fetchCloudAppData()
  return appData.works
}

export const syncCloudWorks = async (records: readonly WorkRecord[]) => {
  const session = getRequiredCloudSession()
  const chunks = createCloudWorkChunks(records)
  const startResult = await postCloudWorksAction({
    action: 'works-put-start',
    accountName: session.accountName,
    accountNameKey: session.accountNameKey,
    passwordVerifier: session.passwordVerifier,
    recordCount: records.length,
    chunkCount: chunks.length,
  })
  if (!startResult.uploadId) {
    throw new Error('云函数没有返回上传批次，请重新部署新版 twilightWorks 云函数。')
  }
  for (const [index, chunk] of chunks.entries()) {
    await postCloudWorksAction({
      action: 'works-put-chunk',
      accountNameKey: session.accountNameKey,
      passwordVerifier: session.passwordVerifier,
      uploadId: startResult.uploadId,
      chunkIndex: index,
      payloadText: chunk.payloadText,
    })
  }
  await postCloudWorksAction({
    action: 'works-put-commit',
    accountName: session.accountName,
    accountNameKey: session.accountNameKey,
    passwordVerifier: session.passwordVerifier,
    uploadId: startResult.uploadId,
    recordCount: records.length,
    chunkCount: chunks.length,
  })
}

export const syncCloudAppData = async (appData: CloudAppData) => {
  const session = getRequiredCloudSession()
  const payload = createAppDataPayload(appData)
  const chunks = createCloudAppDataChunks(payload)
  const startResult = await postCloudWorksAction({
    action: 'works-put-start',
    accountName: session.accountName,
    accountNameKey: session.accountNameKey,
    passwordVerifier: session.passwordVerifier,
    payloadType: 'app-data',
    recordCount: payload.works.length,
    chunkCount: chunks.length,
  })
  if (!startResult.uploadId) {
    throw new Error('云函数没有返回上传批次，请重新部署新版 twilightWorks 云函数。')
  }
  for (const [index, chunk] of chunks.entries()) {
    await postCloudWorksAction({
      action: 'works-put-chunk',
      accountNameKey: session.accountNameKey,
      passwordVerifier: session.passwordVerifier,
      uploadId: startResult.uploadId,
      chunkIndex: index,
      payloadText: chunk.payloadText,
      payloadType: 'app-data',
      type: 'app-data',
    })
  }
  await postCloudWorksAction({
    action: 'works-put-commit',
    accountName: session.accountName,
    accountNameKey: session.accountNameKey,
    passwordVerifier: session.passwordVerifier,
    uploadId: startResult.uploadId,
    payloadType: 'app-data',
    recordCount: payload.works.length,
    chunkCount: chunks.length,
  })
}

export const syncCloudMetadataPatch = async (patch: CloudMetadataPatch) => {
  const session = getRequiredCloudSession()
  const result = await postIdempotentCloudWorksAction({
    action: 'metadata-patch',
    accountName: session.accountName,
    accountNameKey: session.accountNameKey,
    passwordVerifier: session.passwordVerifier,
    patch: createMetadataPatchPayload(patch),
  })

  if (result.status !== 'metadata_saved') {
    throw new Error('云函数不支持轻量同步，请重新部署新版 twilightWorks 云函数后再试。')
  }
}

const isSignedPhotoUpload = (value: unknown): value is CloudPhotoSignedUpload => {
  if (!value || typeof value !== 'object') return false
  const target = value as Partial<CloudPhotoSignedUpload>
  return (
    typeof target.objectKey === 'string' &&
    typeof target.url === 'string' &&
    target.method === 'PUT' &&
    typeof target.contentType === 'string' &&
    typeof target.expiresAt === 'string'
  )
}

const isPhotoDownload = (value: unknown): value is CloudPhotoDownload => {
  if (!value || typeof value !== 'object') return false
  const target = value as Partial<CloudPhotoDownload>
  return (
    typeof target.workId === 'string' &&
    typeof target.objectKey === 'string' &&
    typeof target.url === 'string' &&
    target.method === 'GET' &&
    typeof target.expiresAt === 'string'
  )
}

export const prepareCloudPhotoUpload = async (
  input: CloudPhotoUploadInput,
): Promise<CloudPhotoUploadPreparation> => {
  const session = getRequiredCloudSession()
  const result = await postIdempotentCloudWorksAction({
    action: 'photo-upload-prepare',
    accountNameKey: session.accountNameKey,
    passwordVerifier: session.passwordVerifier,
    ...input,
  })
  if (
    (result.mode !== 'preview-only' && result.mode !== 'original-and-preview') ||
    typeof result.photoRevision !== 'string' ||
    typeof result.expiresAt !== 'string' ||
    !isSignedPhotoUpload(result.preview) ||
    (result.mode === 'original-and-preview' && !isSignedPhotoUpload(result.original))
  ) {
    throw new Error('云函数返回的照片上传地址无效，请重新部署后重试。')
  }
  return {
    mode: result.mode,
    photoRevision: result.photoRevision,
    original: isSignedPhotoUpload(result.original) ? result.original : undefined,
    preview: result.preview,
    expiresAt: result.expiresAt,
  }
}

export const prepareCloudPhotoDownloads = async (
  workIds: string[],
  kind: 'preview' | 'original',
): Promise<CloudPhotoDownload[]> => {
  const session = getRequiredCloudSession()
  const result = await postIdempotentCloudWorksAction({
    action: 'photo-download-prepare',
    accountNameKey: session.accountNameKey,
    passwordVerifier: session.passwordVerifier,
    workIds,
    kind,
  })
  if (!Array.isArray(result.downloads) || !result.downloads.every(isPhotoDownload)) {
    throw new Error('云函数返回的照片下载地址无效，请重新部署后重试。')
  }
  return result.downloads
}

export const createCloudWorkDocument = (
  record: WorkRecord,
  ownerId: string,
): Required<CloudWorkDocument> => ({
  _id: record.id,
  ownerId,
  madeAt: record.madeAt,
  cocktailSlug: record.cocktailSlug,
  cocktailName: record.cocktailName,
  photoDataUrl: record.photoDataUrl,
  photoFileId: '',
  photoOriginalObjectKey: record.photoOriginalObjectKey,
  photoPreviewObjectKey: record.photoPreviewObjectKey,
  photoOriginalName: record.photoOriginalName,
  photoOriginalMime: record.photoOriginalMime,
  photoOriginalSize: record.photoOriginalSize,
  photoRevision: record.photoRevision,
  photoBackupMode: record.photoBackupMode,
  ingredientsText: record.ingredientsText,
  ingredientGroups: record.ingredientGroups ?? {
    baseLiquors: [],
    flavorLiquors: [],
    beverages: [],
    other: '',
  },
  rating: record.rating,
  mood: record.mood,
  selfReview: record.selfReview,
  notes: record.notes,
  createdAt: record.createdAt,
  updatedAt: new Date().toISOString(),
})

export const toCloudWorkWriteData = (document: Required<CloudWorkDocument>) => {
  const writeData: CloudWorkDocument = { ...document }
  delete writeData._id
  return writeData
}

export const toWorkRecordFromCloudDocument = (document: CloudWorkDocument): WorkRecord | null => {
  if (!document._id || !document.madeAt || !document.cocktailName || !document.createdAt) {
    return null
  }

  return {
    id: document._id,
    madeAt: document.madeAt,
    cocktailSlug: document.cocktailSlug ?? '',
    cocktailName: document.cocktailName,
    photoDataUrl: document.photoDataUrl ?? '',
    photoOriginalObjectKey: document.photoOriginalObjectKey ?? '',
    photoPreviewObjectKey: document.photoPreviewObjectKey ?? '',
    photoOriginalName: document.photoOriginalName ?? '',
    photoOriginalMime: document.photoOriginalMime ?? '',
    photoOriginalSize: document.photoOriginalSize ?? 0,
    photoRevision: document.photoRevision ?? '',
    photoBackupMode:
      document.photoBackupMode === 'preview-only' ||
      document.photoBackupMode === 'original-and-preview'
        ? document.photoBackupMode
        : 'none',
    ingredientsText: document.ingredientsText ?? '',
    ingredientGroups: isIngredientGroups(document.ingredientGroups)
      ? document.ingredientGroups
      : undefined,
    rating: typeof document.rating === 'number' ? document.rating : 0,
    mood: document.mood ?? '',
    selfReview: document.selfReview ?? '',
    notes: document.notes ?? '',
    createdAt: document.createdAt,
  }
}
