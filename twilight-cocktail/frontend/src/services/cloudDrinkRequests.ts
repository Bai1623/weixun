import type { WorkIngredientGroups } from '@/stores/works'
import { getCloudWorksApiUrl, getCloudWorksSession } from './cloudWorks'

const shareTokenStoragePrefix = 'twilight_drink_request_share_token'
const maxPayloadBytes = 6 * 1024
const maxTextLengths = {
  guestName: 24,
  cocktailName: 40,
  ingredient: 40,
  other: 200,
  note: 160,
} as const

export type DrinkRequestInput = {
  guestName?: string
  cocktailName: string
  photoDataUrl?: string
  ingredientGroups?: WorkIngredientGroups
  note?: string
}

export type DrinkRequest = {
  id: string
  guestName: string
  cocktailName: string
  ingredientGroups: WorkIngredientGroups
  note: string
  createdAt: string
}

export type DrinkRequestShareState = {
  enabled: boolean
  token: string
  url: string
  requestCount: number
  updatedAt: string
}

type CloudDrinkRequestResponse = {
  ok?: boolean
  error?: string
  message?: string
  status?: string
  enabled?: boolean
  requestCount?: number
  updatedAt?: string
  requests?: unknown
}

const byteLength = (value: string) => new Blob([value]).size

const trimText = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const assertMaxLength = (label: string, value: string, maxLength: number) => {
  if (Array.from(value).length > maxLength) {
    throw new Error(`${label}最多 ${maxLength} 个字。`)
  }
}

const normalizeText = (label: string, value: unknown, maxLength: number, required = false) => {
  const next = trimText(value)
  if (required && !next) throw new Error(`请填写${label}。`)
  assertMaxLength(label, next, maxLength)
  return next
}

const normalizeMaterialList = (values: unknown, maxItems: number) => {
  if (!Array.isArray(values)) return []
  return values
    .map((item) => normalizeText('材料', item, maxTextLengths.ingredient))
    .filter(Boolean)
    .slice(0, maxItems)
}

const createEmptyIngredientGroups = (): WorkIngredientGroups => ({
  baseLiquors: [],
  flavorLiquors: [],
  beverages: [],
  other: '',
})

export const normalizeDrinkRequestInput = (input: DrinkRequestInput): DrinkRequestInput => {
  if (input.photoDataUrl) throw new Error('朋友点单不支持上传图片。')

  const ingredientGroups = input.ingredientGroups ?? createEmptyIngredientGroups()
  const normalized: DrinkRequestInput = {
    guestName: normalizeText('称呼', input.guestName, maxTextLengths.guestName),
    cocktailName: normalizeText('酒名', input.cocktailName, maxTextLengths.cocktailName, true),
    ingredientGroups: {
      baseLiquors: normalizeMaterialList(ingredientGroups.baseLiquors, 4),
      flavorLiquors: normalizeMaterialList(ingredientGroups.flavorLiquors, 8),
      beverages: normalizeMaterialList(ingredientGroups.beverages, 8),
      other: normalizeText('其他材料', ingredientGroups.other, maxTextLengths.other),
    },
    note: normalizeText('备注', input.note, maxTextLengths.note),
  }

  if (byteLength(JSON.stringify(normalized)) > maxPayloadBytes) {
    throw new Error('点单内容过长，请减少材料或备注。')
  }
  return normalized
}

const getRequiredCloudSession = () => {
  const session = getCloudWorksSession()
  if (!session) throw new Error('请先在作品分享里登录云端账号。')
  return session
}

const postCloudDrinkAction = async (
  body: Record<string, unknown>,
): Promise<CloudDrinkRequestResponse> => {
  const url = getCloudWorksApiUrl()
  if (!url) throw new Error('请先配置 VITE_CLOUDBASE_WORKS_API_URL 云函数地址。')

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('无法连接云函数。请重新部署新版 twilightWorks 云函数后再试。')
    }
    throw error
  }

  const data = (await response.json().catch(() => ({}))) as CloudDrinkRequestResponse
  if (!response.ok || data.error) {
    throw new Error(data.message || data.error || '云函数请求失败。')
  }
  if (data.status === 'password_mismatch') throw new Error('云端账号密码不匹配。')
  if (data.status === 'share_disabled') throw new Error('这个点单链接已经关闭。')
  return data
}

const createShareToken = () => {
  const bytes = new Uint8Array(24)
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes)
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 26)}`
}

const shareTokenStorageKey = () =>
  `${shareTokenStoragePrefix}:${getRequiredCloudSession().accountNameKey}`

export const getLocalDrinkRequestShareToken = () => {
  const session = getCloudWorksSession()
  if (!session) return ''
  return window.localStorage.getItem(`${shareTokenStoragePrefix}:${session.accountNameKey}`) ?? ''
}

const saveLocalDrinkRequestShareToken = (token: string) => {
  window.localStorage.setItem(shareTokenStorageKey(), token)
}

const clearLocalDrinkRequestShareToken = () => {
  const session = getCloudWorksSession()
  if (!session) return
  window.localStorage.removeItem(`${shareTokenStoragePrefix}:${session.accountNameKey}`)
}

export const buildDrinkRequestShareUrl = (token: string) =>
  `${window.location.origin}${window.location.pathname}#/want/${encodeURIComponent(token)}`

const toShareState = (
  data: CloudDrinkRequestResponse,
  token = getLocalDrinkRequestShareToken(),
): DrinkRequestShareState => ({
  enabled: Boolean(data.enabled),
  token: data.enabled ? token : '',
  url: data.enabled && token ? buildDrinkRequestShareUrl(token) : '',
  requestCount: Number(data.requestCount || 0),
  updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
})

export const getDrinkRequestShare = async () => {
  const session = getRequiredCloudSession()
  const data = await postCloudDrinkAction({
    action: 'request-share-get',
    accountNameKey: session.accountNameKey,
    passwordVerifier: session.passwordVerifier,
  })
  return toShareState(data)
}

export const resetDrinkRequestShare = async () => {
  const session = getRequiredCloudSession()
  const token = createShareToken()
  const data = await postCloudDrinkAction({
    action: 'request-share-reset',
    accountNameKey: session.accountNameKey,
    passwordVerifier: session.passwordVerifier,
    shareToken: token,
  })
  saveLocalDrinkRequestShareToken(token)
  return toShareState({ ...data, enabled: true }, token)
}

export const disableDrinkRequestShare = async () => {
  const session = getRequiredCloudSession()
  await postCloudDrinkAction({
    action: 'request-share-disable',
    accountNameKey: session.accountNameKey,
    passwordVerifier: session.passwordVerifier,
  })
  clearLocalDrinkRequestShareToken()
}

const isDrinkRequest = (value: unknown): value is DrinkRequest => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<DrinkRequest>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.cocktailName === 'string' &&
    typeof candidate.createdAt === 'string'
  )
}

export const fetchDrinkRequests = async () => {
  const session = getRequiredCloudSession()
  const data = await postCloudDrinkAction({
    action: 'drink-requests-get',
    accountNameKey: session.accountNameKey,
    passwordVerifier: session.passwordVerifier,
  })
  return Array.isArray(data.requests) ? data.requests.filter(isDrinkRequest) : []
}

export const deleteDrinkRequest = async (requestId: string) => {
  const session = getRequiredCloudSession()
  const id = requestId.trim()
  if (!id) throw new Error('请选择要删除的点单。')
  await postCloudDrinkAction({
    action: 'drink-request-delete',
    accountNameKey: session.accountNameKey,
    passwordVerifier: session.passwordVerifier,
    requestId: id,
  })
}

export const submitDrinkRequest = async (shareToken: string, input: DrinkRequestInput) => {
  const inputWithoutPhoto = { ...input }
  delete inputWithoutPhoto.photoDataUrl
  const normalized = normalizeDrinkRequestInput(inputWithoutPhoto)
  await postCloudDrinkAction({
    action: 'drink-request-submit',
    shareToken,
    request: normalized,
  })
}
