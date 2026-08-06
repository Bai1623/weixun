import type { WorkIngredientGroups, WorkRecord } from '@/stores/works'

export const CLOUD_WORKS_COLLECTION = 'works'
const defaultCloudWorksApiUrl =
  'https://weixun-d8g9xwqak83952747-1462034992.ap-shanghai.app.tcloudbase.com/twilightWorks'
const cloudWorksApiUrl = import.meta.env.VITE_CLOUDBASE_WORKS_API_URL || defaultCloudWorksApiUrl
const cloudSessionStorageKey = 'twilight_cloud_works_session'
const defaultUploadChunkBytes = 256 * 1024

export type CloudWorksSession = {
  accountName: string
  accountNameKey: string
  passwordVerifier: string
  updatedAt: string
}

type CloudWorksPayload = {
  version: 1
  app: 'twilight-mixbook'
  type: 'work-records'
  records: WorkRecord[]
}

type CloudWorksResponse = {
  ok?: boolean
  status?: string
  error?: string
  message?: string
  accountName?: string
  recordCount?: number
  uploadId?: string
  payload?: CloudWorksPayload
}

type CloudWorkDocument = {
  _id?: string
  ownerId?: string
  madeAt?: string
  cocktailSlug?: string
  cocktailName?: string
  photoDataUrl?: string
  photoFileId?: string
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

const byteLength = (value: string) => new Blob([value]).size

export const createCloudWorkChunks = (
  records: readonly WorkRecord[],
  maxChunkBytes = defaultUploadChunkBytes,
) => {
  const chunks: Array<{ records: WorkRecord[] }> = []
  let current: WorkRecord[] = []

  records.forEach((record) => {
    const nextRecord = { ...record }
    const candidate = [...current, nextRecord]
    const candidateSize = byteLength(JSON.stringify(createPayload(candidate)))
    if (current.length && candidateSize > maxChunkBytes) {
      chunks.push({ records: current })
      current = [nextRecord]
      return
    }
    current = candidate
  })

  if (current.length || !chunks.length) {
    chunks.push({ records: current })
  }

  return chunks
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
        '无法连接云函数。若登录正常但上传失败，请重新部署新版 twilightWorks 云函数后再试。',
      )
    }
    throw error
  }
  const data = (await response.json().catch(() => ({}))) as CloudWorksResponse
  if (!response.ok || data.error) {
    throw new Error(data.message || data.error || '云函数请求失败。')
  }
  if (data.status === 'password_mismatch') {
    throw new Error('云端账号密码不匹配。')
  }
  return data
}

export const loginCloudWorksAccount = async (accountName: string, password: string) => {
  const identity = await buildCloudWorksIdentity(accountName, password)
  const result = await postCloudWorksAction({
    action: 'account-login',
    ...identity,
  })

  if (result.status === 'account_not_found') {
    await postCloudWorksAction({
      action: 'account-create',
      ...identity,
    })
  }

  const session: CloudWorksSession = {
    ...identity,
    updatedAt: new Date().toISOString(),
  }
  saveCloudSession(session)
  return session
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
  const records = (payload as { records?: unknown }).records
  if (!Array.isArray(records)) return []
  return records.flatMap((item) => (isWorkRecord(item) ? [item] : []))
}

export const fetchCloudWorks = async () => {
  const session = getRequiredCloudSession()
  const result = await postCloudWorksAction({
    action: 'works-get',
    accountNameKey: session.accountNameKey,
    passwordVerifier: session.passwordVerifier,
  })
  return normalizeCloudRecords(result.payload)
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
  await Promise.all(
    chunks.map((chunk, index) =>
      postCloudWorksAction({
        action: 'works-put-chunk',
        accountNameKey: session.accountNameKey,
        passwordVerifier: session.passwordVerifier,
        uploadId: startResult.uploadId,
        chunkIndex: index,
        payload: createPayload(chunk.records),
      }),
    ),
  )
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
