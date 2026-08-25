export type DreamMood =
  | 'calm'
  | 'joyful'
  | 'mysterious'
  | 'sad'
  | 'anxious'
  | 'fearful'
  | 'surreal'
  | 'neutral'

export type DreamStatus = 'draft' | 'saved'
export type DreamClarity = 1 | 2 | 3 | 4 | 5

export interface DreamRecord {
  id: string
  schemaVersion: 1
  status: DreamStatus
  createdAt: string
  updatedAt: string
  dreamedAt: string
  rawText: string
  title: string | null
  summary: string | null
  mood: DreamMood
  clarity: DreamClarity
  lucid: boolean
  tags: string[]
  favorite: boolean
  audioAssetIds: string[]
  coverSeed: string
  coverPalette: string
  aiImageAssetId: string | null
  aiKeywords: string[]
  aiUpdatedAt: string | null
}

export function createDraftDream(id: string, now: Date): DreamRecord {
  const timestamp = now.toISOString()

  return {
    id,
    schemaVersion: 1,
    status: 'draft',
    createdAt: timestamp,
    updatedAt: timestamp,
    dreamedAt: timestamp.slice(0, 10),
    rawText: '',
    title: null,
    summary: null,
    mood: 'neutral',
    clarity: 3,
    lucid: false,
    tags: [],
    favorite: false,
    audioAssetIds: [],
    coverSeed: id,
    coverPalette: 'mist',
    aiImageAssetId: null,
    aiKeywords: [],
    aiUpdatedAt: null,
  }
}
