import type { IDBPDatabase } from 'idb'
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'

import type { ShimengDb } from '@/core/persistence/db'
import type { DreamRecord } from '@/features/dreams/model/dream'
import type { MediaAsset } from '@/features/media/model/media'
import type {
  BackupInspection,
  BackupManifest,
  BackupMediaDescriptor,
  RestoreReport,
} from '../model/backup'

const mimeExtensions: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

function fail(message: string): never {
  throw new Error(message)
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isDreamRecord(value: unknown): value is DreamRecord {
  if (!isObject(value)) return false
  return (
    typeof value.id === 'string' &&
    value.schemaVersion === 1 &&
    (value.status === 'draft' || value.status === 'saved') &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string' &&
    typeof value.dreamedAt === 'string' &&
    typeof value.rawText === 'string' &&
    (typeof value.title === 'string' || value.title === null) &&
    (typeof value.summary === 'string' || value.summary === null) &&
    typeof value.mood === 'string' &&
    [1, 2, 3, 4, 5].includes(value.clarity as number) &&
    typeof value.lucid === 'boolean' &&
    Array.isArray(value.tags) &&
    value.tags.every((tag) => typeof tag === 'string') &&
    typeof value.favorite === 'boolean' &&
    Array.isArray(value.audioAssetIds) &&
    value.audioAssetIds.every((id) => typeof id === 'string') &&
    typeof value.coverSeed === 'string' &&
    typeof value.coverPalette === 'string' &&
    (typeof value.aiImageAssetId === 'string' || value.aiImageAssetId === null) &&
    Array.isArray(value.aiKeywords) &&
    value.aiKeywords.every((keyword) => typeof keyword === 'string') &&
    (typeof value.aiUpdatedAt === 'string' || value.aiUpdatedAt === null)
  )
}

function isMediaDescriptor(value: unknown): value is BackupMediaDescriptor {
  if (!isObject(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.dreamId === 'string' &&
    (value.kind === 'audio' || value.kind === 'ai-image') &&
    typeof value.mimeType === 'string' &&
    typeof value.size === 'number' &&
    typeof value.createdAt === 'string' &&
    typeof value.path === 'string'
  )
}

function readJson(entry: Uint8Array | undefined): unknown {
  if (!entry) fail('备份文件不完整')
  try {
    return JSON.parse(strFromU8(entry))
  } catch {
    fail('备份文件格式不正确')
  }
}

export async function createBackup(db: IDBPDatabase<ShimengDb>): Promise<Blob> {
  const [dreams, media] = await Promise.all([db.getAll('dreams'), db.getAll('media')])
  const entries: Record<string, Uint8Array> = {
    'dreams.json': strToU8(JSON.stringify(dreams)),
  }
  const descriptors: BackupMediaDescriptor[] = []

  for (const asset of media) {
    const extension = mimeExtensions[asset.mimeType]
    if (!extension) fail(`暂不支持备份媒体类型：${asset.mimeType}`)
    const path = `media/${asset.id}.${extension}`
    descriptors.push({
      id: asset.id,
      dreamId: asset.dreamId,
      kind: asset.kind,
      mimeType: asset.mimeType,
      size: asset.size,
      createdAt: asset.createdAt,
      path,
    })
    entries[path] = new Uint8Array(await asset.blob.arrayBuffer())
  }

  const manifest: BackupManifest = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    dreamCount: dreams.length,
    mediaCount: descriptors.length,
    media: descriptors,
  }
  entries['manifest.json'] = strToU8(JSON.stringify(manifest))
  const archive = zipSync(entries, { level: 6 })
  return new Blob([archive.slice().buffer], { type: 'application/zip' })
}

export async function inspectBackup(blob: Blob): Promise<BackupInspection> {
  let entries: Record<string, Uint8Array>
  try {
    entries = unzipSync(new Uint8Array(await blob.arrayBuffer()))
  } catch {
    fail('备份文件格式不正确')
  }

  const manifestValue = readJson(entries['manifest.json'])
  if (!isObject(manifestValue)) fail('备份文件格式不正确')
  if (manifestValue.schemaVersion !== 1) fail('不支持的备份版本')
  if (
    typeof manifestValue.exportedAt !== 'string' ||
    typeof manifestValue.dreamCount !== 'number' ||
    typeof manifestValue.mediaCount !== 'number' ||
    !Array.isArray(manifestValue.media) ||
    !manifestValue.media.every(isMediaDescriptor)
  ) {
    fail('备份清单格式不正确')
  }
  const manifest = manifestValue as unknown as BackupManifest

  const dreamsValue = readJson(entries['dreams.json'])
  if (!Array.isArray(dreamsValue) || !dreamsValue.every(isDreamRecord)) {
    fail('梦境数据格式不正确')
  }
  if (dreamsValue.length !== manifest.dreamCount || manifest.media.length !== manifest.mediaCount) {
    fail('备份数量与清单不一致')
  }

  const media: MediaAsset[] = manifest.media.map((descriptor) => {
    const bytes = entries[descriptor.path]
    if (!bytes) fail('备份缺少媒体文件')
    if (!mimeExtensions[descriptor.mimeType]) fail(`备份包含不支持的媒体类型：${descriptor.mimeType}`)
    if (bytes.byteLength !== descriptor.size) fail('备份媒体文件大小不一致')
    return {
      id: descriptor.id,
      dreamId: descriptor.dreamId,
      kind: descriptor.kind,
      mimeType: descriptor.mimeType,
      size: descriptor.size,
      createdAt: descriptor.createdAt,
      blob: new Blob([bytes.slice().buffer], { type: descriptor.mimeType }),
    }
  })

  const dreamIds = new Set(dreamsValue.map((dream) => dream.id))
  if (media.some((asset) => !dreamIds.has(asset.dreamId))) fail('备份媒体缺少对应梦境')

  return {
    manifest,
    dreams: dreamsValue,
    media,
    warnings: [],
    counts: { dreams: dreamsValue.length, media: media.length },
  }
}

export async function restoreBackup(
  db: IDBPDatabase<ShimengDb>,
  inspection: BackupInspection,
): Promise<RestoreReport> {
  const [existingDreamList, existingMediaList] = await Promise.all([
    db.getAll('dreams'),
    db.getAll('media'),
  ])
  const existingDreams = new Map(existingDreamList.map((dream) => [dream.id, dream]))
  const existingMedia = new Set(existingMediaList.map((asset) => asset.id))
  const plans = new Map<
    string,
    { source: DreamRecord; target: DreamRecord; shouldWrite: boolean; conflict: boolean }
  >()
  let imported = 0
  let skipped = 0
  let conflictCopies = 0

  for (const source of inspection.dreams) {
    const existing = existingDreams.get(source.id)
    if (!existing) {
      plans.set(source.id, { source, target: structuredClone(source), shouldWrite: true, conflict: false })
      imported += 1
    } else if (JSON.stringify(existing) === JSON.stringify(source)) {
      plans.set(source.id, { source, target: existing, shouldWrite: false, conflict: false })
      skipped += 1
    } else {
      const id = crypto.randomUUID()
      const target: DreamRecord = {
        ...structuredClone(source),
        id,
        tags: [...new Set([...source.tags, '恢复副本'])],
      }
      plans.set(source.id, { source, target, shouldWrite: true, conflict: true })
      imported += 1
      conflictCopies += 1
    }
  }

  const mediaIdMap = new Map<string, string>()
  const mediaToWrite: MediaAsset[] = []
  for (const sourceAsset of inspection.media) {
    const plan = plans.get(sourceAsset.dreamId)
    if (!plan) continue
    if (!plan.conflict && existingMedia.has(sourceAsset.id)) continue

    const id = plan.conflict || existingMedia.has(sourceAsset.id) ? crypto.randomUUID() : sourceAsset.id
    mediaIdMap.set(sourceAsset.id, id)
    mediaToWrite.push({
      ...sourceAsset,
      id,
      dreamId: plan.target.id,
    })
  }

  const dreamsToWrite = [...plans.values()]
    .filter((plan) => plan.shouldWrite)
    .map(({ target }) => ({
      ...target,
      audioAssetIds: target.audioAssetIds.map((id) => mediaIdMap.get(id) ?? id),
      aiImageAssetId: target.aiImageAssetId
        ? (mediaIdMap.get(target.aiImageAssetId) ?? target.aiImageAssetId)
        : null,
    }))

  const transaction = db.transaction(['dreams', 'media'], 'readwrite')
  await Promise.all([
    ...dreamsToWrite.map((dream) => transaction.objectStore('dreams').put(dream)),
    ...mediaToWrite.map((asset) => transaction.objectStore('media').put(asset)),
    transaction.done,
  ])

  return { imported, skipped, conflictCopies }
}
