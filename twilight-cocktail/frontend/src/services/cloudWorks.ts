import cloudbase from '@cloudbase/js-sdk'

import type { WorkIngredientGroups, WorkRecord } from '@/stores/works'

export const CLOUD_WORKS_COLLECTION = 'works'
const cloudbaseEnvId = import.meta.env.VITE_CLOUDBASE_ENV_ID || 'weixun-d8g9xwqak83952747'

type CloudUser = {
  uid?: string
  user?: {
    uid?: string
  }
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

let app: ReturnType<typeof cloudbase.init> | null = null
let cloudUserId: string | null = null

export const getCloudbaseEnvId = () => cloudbaseEnvId

const getCloudbaseApp = () => {
  if (!app) {
    app = cloudbase.init({
      env: cloudbaseEnvId,
    })
  }
  return app
}

const getCloudUserId = async () => {
  if (cloudUserId) return cloudUserId

  const auth = getCloudbaseApp().auth({ persistence: 'local' })
  const currentUser = await auth.getCurrentUser()
  if (currentUser?.uid) {
    cloudUserId = currentUser.uid
    return cloudUserId
  }

  const signInResult = (await auth.signInAnonymously()) as CloudUser
  const uid = signInResult.user?.uid || signInResult.uid
  if (!uid) throw new Error('CloudBase 匿名登录失败，请确认已开启身份认证。')
  cloudUserId = uid
  return cloudUserId
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

export const isCloudWorksEnabled = () => Boolean(cloudbaseEnvId)

export const fetchCloudWorks = async () => {
  const ownerId = await getCloudUserId()
  const result = await getCloudbaseApp()
    .database()
    .collection(CLOUD_WORKS_COLLECTION)
    .where({ ownerId })
    .orderBy('madeAt', 'desc')
    .get()
  const list = Array.isArray(result.data) ? result.data : []
  return list.flatMap((item) => {
    const record = toWorkRecordFromCloudDocument(item as CloudWorkDocument)
    return record ? [record] : []
  })
}

export const saveCloudWork = async (record: WorkRecord) => {
  const ownerId = await getCloudUserId()
  await getCloudbaseApp()
    .database()
    .collection(CLOUD_WORKS_COLLECTION)
    .doc(record.id)
    .set(createCloudWorkDocument(record, ownerId))
}

export const deleteCloudWork = async (id: string) => {
  await getCloudUserId()
  await getCloudbaseApp().database().collection(CLOUD_WORKS_COLLECTION).doc(id).remove()
}

export const syncCloudWorks = async (records: readonly WorkRecord[]) => {
  const ownerId = await getCloudUserId()
  const collection = getCloudbaseApp().database().collection(CLOUD_WORKS_COLLECTION)
  await Promise.all(
    records.map((record) =>
      collection.doc(record.id).set(createCloudWorkDocument(record, ownerId)),
    ),
  )
}
