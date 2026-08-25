import { ref } from 'vue'

import { openShimengDb } from '@/core/persistence/db'
import type { DreamRecord } from '@/features/dreams/model/dream'
import { createMediaRepository } from '@/features/media/data/mediaRepository'
import type { MediaAsset } from '@/features/media/model/media'

import type { OrganizeDreamResult } from '../model/ai'
import { HttpDreamAiGateway } from '../services/HttpDreamAiGateway'

export function useDreamAi(saveDream: (record: DreamRecord) => Promise<unknown>) {
  const organizingCandidate = ref<OrganizeDreamResult | null>(null)
  const transcriptCandidate = ref<string | null>(null)
  const busy = ref(false)
  const error = ref<string | null>(null)

  async function run(task: () => Promise<void>) {
    busy.value = true
    error.value = null
    try {
      await task()
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'AI 操作失败，请稍后重试'
    } finally {
      busy.value = false
    }
  }

  function gateway(endpoint: string) {
    return new HttpDreamAiGateway(endpoint)
  }

  async function organize(dream: DreamRecord, endpoint: string) {
    await run(async () => {
      organizingCandidate.value = await gateway(endpoint).organizeDream(
        {
          rawText: dream.rawText,
          metadata: {
            dreamedAt: dream.dreamedAt,
            mood: dream.mood,
            clarity: dream.clarity,
            lucid: dream.lucid,
            tags: [...dream.tags],
          },
        },
        new AbortController().signal,
      )
    })
  }

  async function applyOrganization(dream: DreamRecord): Promise<DreamRecord | null> {
    if (!organizingCandidate.value) return null
    let updated: DreamRecord | null = null
    await run(async () => {
      const candidate = organizingCandidate.value!
      updated = {
        ...dream,
        title: candidate.title,
        summary: candidate.summary,
        mood: candidate.mood,
        aiKeywords: [...candidate.keywords],
        aiUpdatedAt: new Date().toISOString(),
      }
      await saveDream(updated)
      organizingCandidate.value = null
    })
    return updated
  }

  async function transcribe(dream: DreamRecord, endpoint: string, assetId: string) {
    await run(async () => {
      const repository = createMediaRepository(await openShimengDb())
      const asset = await repository.get(assetId)
      if (!asset || asset.kind !== 'audio') throw new Error('所选录音暂时无法读取')
      const result = await gateway(endpoint).transcribeAudio(asset.blob, new AbortController().signal)
      transcriptCandidate.value = result.transcript
    })
  }

  async function applyTranscript(dream: DreamRecord): Promise<DreamRecord | null> {
    if (!transcriptCandidate.value) return null
    let updated: DreamRecord | null = null
    await run(async () => {
      const transcript = transcriptCandidate.value!
      updated = {
        ...dream,
        rawText: dream.rawText.trim() ? `${dream.rawText.trim()}\n\n${transcript}` : transcript,
      }
      await saveDream(updated)
      transcriptCandidate.value = null
    })
    return updated
  }

  async function generateImage(dream: DreamRecord, endpoint: string): Promise<DreamRecord | null> {
    let updated: DreamRecord | null = null
    await run(async () => {
      const repository = createMediaRepository(await openShimengDb())
      const image = await gateway(endpoint).generateDreamImage(
        {
          summary: dream.summary?.trim() || dream.rawText.slice(0, 1_000),
          mood: dream.mood,
          keywords: dream.aiKeywords.length ? [...dream.aiKeywords] : [...dream.tags],
        },
        new AbortController().signal,
      )
      const assetId = crypto.randomUUID()
      const asset: MediaAsset = {
        id: assetId,
        dreamId: dream.id,
        kind: 'ai-image',
        mimeType: image.type,
        size: image.size,
        createdAt: new Date().toISOString(),
        blob: image,
      }
      await repository.put(asset)
      try {
        updated = { ...dream, aiImageAssetId: assetId }
        await saveDream(updated)
      } catch (cause) {
        await repository.delete(assetId)
        throw cause
      }
      if (dream.aiImageAssetId) await repository.delete(dream.aiImageAssetId)
    })
    return updated
  }

  async function restoreAtmosphereCover(dream: DreamRecord): Promise<DreamRecord | null> {
    if (!dream.aiImageAssetId) return dream
    let updated: DreamRecord | null = null
    await run(async () => {
      const oldAssetId = dream.aiImageAssetId!
      updated = { ...dream, aiImageAssetId: null }
      await saveDream(updated)
      await createMediaRepository(await openShimengDb()).delete(oldAssetId)
    })
    return updated
  }

  async function clearOrganization(dream: DreamRecord): Promise<DreamRecord | null> {
    let updated: DreamRecord | null = null
    await run(async () => {
      updated = {
        ...dream,
        title: null,
        summary: null,
        aiKeywords: [],
        aiUpdatedAt: null,
      }
      await saveDream(updated)
    })
    return updated
  }

  return {
    organizingCandidate,
    transcriptCandidate,
    busy,
    error,
    organize,
    applyOrganization,
    transcribe,
    applyTranscript,
    generateImage,
    restoreAtmosphereCover,
    clearOrganization,
  }
}
