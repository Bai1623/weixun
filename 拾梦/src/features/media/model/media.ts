export type MediaKind = 'audio' | 'ai-image'

export interface MediaAsset {
  id: string
  dreamId: string
  kind: MediaKind
  mimeType: string
  size: number
  createdAt: string
  blob: Blob
}
