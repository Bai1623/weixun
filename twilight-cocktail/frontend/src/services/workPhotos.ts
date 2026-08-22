import {
  prepareCloudPhotoDownloads,
  prepareCloudPhotoUpload,
  type CloudPhotoDownload,
  type CloudPhotoUploadPreparation,
} from '@/services/cloudWorks'
import {
  getWorkPhoto,
  hasCachedPreview,
  putWorkPhoto,
  setWorkPhotoSyncState,
} from '@/services/workPhotoCache'

const maxOriginalBytes = 50 * 1024 * 1024
const maxPreviewSize = 1280
const previewQuality = 0.82
const restoreBatchSize = 50
const restoreConcurrency = 3

export type PreparedWorkPhoto = {
  revision: string
  original: File
  preview: Blob
  previewDataUrl: string
}

export type WorkPhotoCloudMetadata = {
  photoOriginalObjectKey: string
  photoPreviewObjectKey: string
  photoOriginalName: string
  photoOriginalMime: string
  photoOriginalSize: number
  photoRevision: string
  photoBackupMode: 'preview-only' | 'original-and-preview'
}

export type WorkPhotoRestoreRecord = {
  id: string
  photoRevision?: string
  photoPreviewObjectKey?: string
}

export type WorkPhotoRestoreFailure = {
  workId: string
  errorMessage: string
}

export type WorkPhotoRestoreProgress = {
  completed: number
  total: number
  failedWorkIds: string[]
  failures: WorkPhotoRestoreFailure[]
}

type RestoreOptions = {
  signal?: AbortSignal
  onProgress?: (progress: WorkPhotoRestoreProgress) => void
}

type PreviewFactory = (file: File) => Promise<Blob>

const createRevision = () =>
  globalThis.crypto?.randomUUID?.() ||
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`

const readBlobDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () =>
      resolve(typeof reader.result === 'string' ? reader.result : ''),
    )
    reader.addEventListener('error', () => reject(reader.error || new Error('无法读取照片。')))
    reader.readAsDataURL(blob)
  })

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', () => reject(new Error('无法读取图片内容。')))
    image.src = url
  })

const createPreviewBlob: PreviewFactory = async (file) => {
  const sourceUrl = URL.createObjectURL(file)
  try {
    const image = await loadImage(sourceUrl)
    const scale = Math.min(1, maxPreviewSize / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('当前浏览器无法压缩照片。')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('照片预览生成失败。'))),
        'image/jpeg',
        previewQuality,
      )
    })
  } finally {
    URL.revokeObjectURL(sourceUrl)
  }
}

export const prepareWorkPhoto = async (
  file: File,
  previewFactory: PreviewFactory = createPreviewBlob,
): Promise<PreparedWorkPhoto> => {
  if (!file.type.startsWith('image/')) throw new Error('请选择图片文件。')
  if (file.size > maxOriginalBytes) throw new Error('原图不能超过 50 MB。')
  const preview = await previewFactory(file)
  if (preview.type !== 'image/jpeg') throw new Error('照片预览必须为 JPEG 格式。')
  return {
    revision: createRevision(),
    original: file,
    preview,
    previewDataUrl: await readBlobDataUrl(preview),
  }
}

export const cachePreparedWorkPhoto = async (workId: string, photo: PreparedWorkPhoto) => {
  const updatedAt = new Date().toISOString()
  await Promise.all([
    putWorkPhoto({
      workId,
      revision: photo.revision,
      kind: 'original',
      blob: photo.original,
      name: photo.original.name,
      mime: photo.original.type,
      size: photo.original.size,
      syncState: 'pending',
      errorMessage: '',
      updatedAt,
    }),
    putWorkPhoto({
      workId,
      revision: photo.revision,
      kind: 'preview',
      blob: photo.preview,
      name: 'preview.jpg',
      mime: 'image/jpeg',
      size: photo.preview.size,
      syncState: 'pending',
      errorMessage: '',
      updatedAt,
    }),
  ])
}

export const cacheLegacyWorkPreview = async (workId: string, dataUrl: string) => {
  const source = await fetch(dataUrl)
  if (!source.ok) throw new Error('旧版照片读取失败。')
  const sourceBlob = await source.blob()
  const preview =
    sourceBlob.type === 'image/jpeg'
      ? sourceBlob
      : await createPreviewBlob(
          new File([sourceBlob], 'legacy-photo', { type: sourceBlob.type || 'image/png' }),
        )
  const revision = createRevision()
  await putWorkPhoto({
    workId,
    revision,
    kind: 'preview',
    blob: preview,
    name: 'preview.jpg',
    mime: 'image/jpeg',
    size: preview.size,
    syncState: 'pending',
    errorMessage: '',
    updatedAt: new Date().toISOString(),
  })
  return revision
}

export const getCachedWorkPreviewDataUrl = async (workId: string, revision: string) => {
  const preview = await getWorkPhoto(workId, revision, 'preview')
  return preview ? readBlobDataUrl(preview.blob) : ''
}

const putSignedPhoto = async (
  target: NonNullable<CloudPhotoUploadPreparation['preview']>,
  blob: Blob,
) => {
  const response = await fetch(target.url, {
    method: 'PUT',
    headers: { 'Content-Type': target.contentType },
    body: blob,
  })
  if (!response.ok) {
    const error = new Error(`照片上传失败（HTTP ${response.status}）。`)
    Object.assign(error, { status: response.status })
    throw error
  }
}

const isExpiredSignatureError = (error: unknown) => {
  const status = (error as { status?: unknown })?.status
  return status === 401 || status === 403
}

export const uploadCachedWorkPhoto = async (
  workId: string,
  revision: string,
): Promise<WorkPhotoCloudMetadata> => {
  const [original, preview] = await Promise.all([
    getWorkPhoto(workId, revision, 'original'),
    getWorkPhoto(workId, revision, 'preview'),
  ])
  if (!preview) throw new Error('本地照片预览不存在。')
  await setWorkPhotoSyncState(workId, revision, 'uploading')

  const requestPreparation = () =>
    prepareCloudPhotoUpload({
      workId,
      photoRevision: revision,
      mode: original ? 'original-and-preview' : 'preview-only',
      original: original
        ? { name: original.name, type: original.mime, size: original.size }
        : undefined,
      preview: { name: preview.name, type: preview.mime, size: preview.size },
    })

  let preparation: CloudPhotoUploadPreparation | undefined
  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      preparation = await requestPreparation()
      try {
        if (original && preparation.original) {
          await putSignedPhoto(preparation.original, original.blob)
        }
        await putSignedPhoto(preparation.preview, preview.blob)
        break
      } catch (error) {
        if (attempt === 0 && isExpiredSignatureError(error)) continue
        throw error
      }
    }
    if (!preparation) throw new Error('无法获取照片上传地址。')
    await setWorkPhotoSyncState(workId, revision, 'synced')
    return {
      photoOriginalObjectKey: preparation.original?.objectKey || '',
      photoPreviewObjectKey: preparation.preview.objectKey,
      photoOriginalName: original?.name || '',
      photoOriginalMime: original?.mime || '',
      photoOriginalSize: original?.size || 0,
      photoRevision: revision,
      photoBackupMode: preparation.mode,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '照片上传失败。'
    await setWorkPhotoSyncState(workId, revision, 'failed', message)
    throw error
  }
}

const fetchSignedPhoto = async (download: CloudPhotoDownload) => {
  const response = await fetch(download.url)
  if (!response.ok) {
    const error = new Error(`照片下载失败（HTTP ${response.status}）。`)
    Object.assign(error, { status: response.status })
    throw error
  }
  return response.blob()
}

const chunksOf = <T>(items: T[], size: number) => {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

const runWithConcurrency = async <T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
) => {
  let nextIndex = 0
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex]
      nextIndex += 1
      if (item === undefined) return
      await worker(item)
    }
  })
  await Promise.all(runners)
}

export const restoreAllWorkPreviews = async (
  records: WorkPhotoRestoreRecord[],
  options: RestoreOptions = {},
): Promise<WorkPhotoRestoreProgress> => {
  const missing: Array<Required<WorkPhotoRestoreRecord>> = []
  for (const record of records) {
    if (!record.photoRevision || !record.photoPreviewObjectKey) continue
    if (!(await hasCachedPreview(record.id, record.photoRevision))) {
      missing.push({
        id: record.id,
        photoRevision: record.photoRevision,
        photoPreviewObjectKey: record.photoPreviewObjectKey,
      })
    }
  }

  const progress: WorkPhotoRestoreProgress = {
    completed: 0,
    total: missing.length,
    failedWorkIds: [],
    failures: [],
  }
  if (!missing.length) {
    options.onProgress?.({ ...progress })
    return progress
  }

  const recordById = new Map(missing.map((record) => [record.id, record]))
  for (const batch of chunksOf(missing, restoreBatchSize)) {
    if (options.signal?.aborted) break
    let downloads: CloudPhotoDownload[]
    try {
      downloads = await prepareCloudPhotoDownloads(
        batch.map((record) => record.id),
        'preview',
      )
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '照片恢复失败。'
      batch.forEach((record) => {
        progress.failedWorkIds.push(record.id)
        progress.failures.push({ workId: record.id, errorMessage })
        progress.completed += 1
        options.onProgress?.({
          completed: progress.completed,
          total: progress.total,
          failedWorkIds: [...progress.failedWorkIds],
          failures: [...progress.failures],
        })
      })
      continue
    }
    const downloadsByWorkId = new Map(downloads.map((download) => [download.workId, download]))
    await runWithConcurrency(batch, restoreConcurrency, async (record) => {
      if (options.signal?.aborted) return
      try {
        const download = downloadsByWorkId.get(record.id)
        if (!download) throw new Error('云端未返回照片下载地址。')
        let blob: Blob
        try {
          blob = await fetchSignedPhoto(download)
        } catch (error) {
          if (!isExpiredSignatureError(error)) throw error
          const [refreshed] = await prepareCloudPhotoDownloads([record.id], 'preview')
          if (!refreshed) throw error
          blob = await fetchSignedPhoto(refreshed)
        }
        await putWorkPhoto({
          workId: record.id,
          revision: record.photoRevision,
          kind: 'preview',
          blob,
          name: 'preview.jpg',
          mime: blob.type || 'image/jpeg',
          size: blob.size,
          syncState: 'synced',
          errorMessage: '',
          updatedAt: new Date().toISOString(),
        })
      } catch (error) {
        progress.failedWorkIds.push(record.id)
        progress.failures.push({
          workId: record.id,
          errorMessage: error instanceof Error ? error.message : '照片恢复失败。',
        })
      } finally {
        if (recordById.has(record.id)) progress.completed += 1
        options.onProgress?.({
          completed: progress.completed,
          total: progress.total,
          failedWorkIds: [...progress.failedWorkIds],
          failures: [...progress.failures],
        })
      }
    })
  }
  return progress
}

export const downloadWorkOriginal = async (workId: string) => {
  const [download] = await prepareCloudPhotoDownloads([workId], 'original')
  if (!download) throw new Error('云端没有这张照片的原图。')
  try {
    return await fetchSignedPhoto(download)
  } catch (error) {
    if (!isExpiredSignatureError(error)) throw error
    const [refreshed] = await prepareCloudPhotoDownloads([workId], 'original')
    if (!refreshed) throw error
    return fetchSignedPhoto(refreshed)
  }
}
