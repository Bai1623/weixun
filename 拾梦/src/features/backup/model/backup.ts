import type { DreamRecord } from '@/features/dreams/model/dream'
import type { MediaAsset, MediaKind } from '@/features/media/model/media'

export interface BackupMediaDescriptor {
  id: string
  dreamId: string
  kind: MediaKind
  mimeType: string
  size: number
  createdAt: string
  path: string
}

export interface BackupManifest {
  schemaVersion: 1
  exportedAt: string
  dreamCount: number
  mediaCount: number
  media: BackupMediaDescriptor[]
}

export interface BackupInspection {
  manifest: BackupManifest
  dreams: DreamRecord[]
  media: MediaAsset[]
  warnings: string[]
  counts: { dreams: number; media: number }
}

export interface RestoreReport {
  imported: number
  skipped: number
  conflictCopies: number
}
