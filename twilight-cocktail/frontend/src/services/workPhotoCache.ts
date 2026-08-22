const databaseName = 'twilight-work-photos'
const databaseVersion = 1
const photoStoreName = 'photos'

export type WorkPhotoKind = 'original' | 'preview'
export type WorkPhotoSyncState = 'pending' | 'uploading' | 'synced' | 'failed'

export type CachedWorkPhoto = {
  workId: string
  revision: string
  kind: WorkPhotoKind
  blob: Blob
  name: string
  mime: string
  size: number
  syncState: WorkPhotoSyncState
  errorMessage: string
  updatedAt: string
}

type StoredWorkPhoto = CachedWorkPhoto & { key: string }

let databasePromise: Promise<IDBDatabase> | undefined

const photoCacheKey = (workId: string, revision: string, kind: WorkPhotoKind) =>
  `${workId}:${revision}:${kind}`

const requestResult = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('照片缓存操作失败。'))
  })

const transactionDone = (transaction: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error || new Error('照片缓存事务已中止。'))
    transaction.onerror = () => reject(transaction.error || new Error('照片缓存事务失败。'))
  })

const openDatabase = () => {
  if (databasePromise) return databasePromise
  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(databaseName, databaseVersion)
    request.onupgradeneeded = () => {
      const database = request.result
      if (database.objectStoreNames.contains(photoStoreName)) return
      const store = database.createObjectStore(photoStoreName, { keyPath: 'key' })
      store.createIndex('workId', 'workId', { unique: false })
      store.createIndex('syncState', 'syncState', { unique: false })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      databasePromise = undefined
      reject(request.error || new Error('无法打开照片缓存。'))
    }
    request.onblocked = () => {
      databasePromise = undefined
      reject(new Error('照片缓存正在被其他页面占用，请关闭其他页面后重试。'))
    }
  })
  return databasePromise
}

const withoutStorageKey = (record: StoredWorkPhoto | undefined): CachedWorkPhoto | undefined => {
  if (!record) return undefined
  const photo = { ...record }
  delete (photo as Partial<StoredWorkPhoto>).key
  return photo
}

export const putWorkPhoto = async (photo: CachedWorkPhoto) => {
  const database = await openDatabase()
  const transaction = database.transaction(photoStoreName, 'readwrite')
  const done = transactionDone(transaction)
  transaction.objectStore(photoStoreName).put({
    ...photo,
    key: photoCacheKey(photo.workId, photo.revision, photo.kind),
  } satisfies StoredWorkPhoto)
  await done
}

export const getWorkPhoto = async (workId: string, revision: string, kind: WorkPhotoKind) => {
  const database = await openDatabase()
  const transaction = database.transaction(photoStoreName, 'readonly')
  const stored = await requestResult<StoredWorkPhoto | undefined>(
    transaction.objectStore(photoStoreName).get(photoCacheKey(workId, revision, kind)),
  )
  return withoutStorageKey(stored)
}

export const hasCachedPreview = async (workId: string, revision: string) =>
  Boolean(await getWorkPhoto(workId, revision, 'preview'))

export const deleteWorkPhotos = async (workId: string) => {
  const database = await openDatabase()
  const transaction = database.transaction(photoStoreName, 'readwrite')
  const done = transactionDone(transaction)
  const store = transaction.objectStore(photoStoreName)
  const keys = await requestResult<IDBValidKey[]>(store.index('workId').getAllKeys(workId))
  keys.forEach((key) => store.delete(key))
  await done
}

export const clearAllWorkPhotos = async () => {
  const database = await openDatabase()
  const transaction = database.transaction(photoStoreName, 'readwrite')
  const done = transactionDone(transaction)
  transaction.objectStore(photoStoreName).clear()
  await done
}

export const listPendingWorkPhotos = async () => {
  const database = await openDatabase()
  const transaction = database.transaction(photoStoreName, 'readonly')
  const records = await requestResult<StoredWorkPhoto[]>(
    transaction.objectStore(photoStoreName).getAll(),
  )
  return records
    .filter((record) => record.syncState !== 'synced')
    .map((record) => withoutStorageKey(record) as CachedWorkPhoto)
}

export const setWorkPhotoSyncState = async (
  workId: string,
  revision: string,
  syncState: WorkPhotoSyncState,
  errorMessage = '',
) => {
  const database = await openDatabase()
  const transaction = database.transaction(photoStoreName, 'readwrite')
  const done = transactionDone(transaction)
  const store = transaction.objectStore(photoStoreName)
  const records = await requestResult<StoredWorkPhoto[]>(store.index('workId').getAll(workId))
  records
    .filter((record) => record.revision === revision)
    .forEach((record) =>
      store.put({
        ...record,
        syncState,
        errorMessage,
        updatedAt: new Date().toISOString(),
      }),
    )
  await done
}
