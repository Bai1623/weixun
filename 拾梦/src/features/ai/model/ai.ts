import type { DreamMood } from '@/features/dreams/model/dream'

export interface OrganizeDreamInput {
  rawText: string
  metadata: {
    dreamedAt: string
    mood: DreamMood
    clarity: number
    lucid: boolean
    tags: string[]
  }
}

export interface OrganizeDreamResult {
  title: string
  summary: string
  mood: DreamMood
  keywords: string[]
}

export interface GenerateDreamImageInput {
  summary: string
  mood: DreamMood
  keywords: string[]
}

export type AiConsentAction = 'organize' | 'transcribe' | 'image' | 'restore-cover' | 'clear-organized'
