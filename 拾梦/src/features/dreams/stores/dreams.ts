import { defineStore } from 'pinia'

import { openShimengDb, StorageWriteError } from '@/core/persistence/db'

import { createDreamRepository, type DreamRepository } from '../data/dreamRepository'
import { createDraftDream, type DreamRecord } from '../model/dream'

let repositoryPromise: Promise<DreamRepository> | undefined

function getDreamRepository(): Promise<DreamRepository> {
  repositoryPromise ??= openShimengDb().then(createDreamRepository)
  return repositoryPromise
}

function updatedRecord(record: DreamRecord, status: DreamRecord['status']): DreamRecord {
  return {
    ...record,
    status,
    updatedAt: new Date().toISOString(),
    tags: [...record.tags],
    audioAssetIds: [...record.audioAssetIds],
    aiKeywords: [...record.aiKeywords],
  }
}

export const useDreamsStore = defineStore('dreams', {
  state: () => ({
    savedDreams: [] as DreamRecord[],
    activeDraft: null as DreamRecord | null,
    storageError: null as string | null,
    loaded: false,
  }),
  actions: {
    async load() {
      const repository = await getDreamRepository()
      const [savedDreams, drafts] = await Promise.all([repository.listSaved(), repository.getDrafts()])
      this.savedDreams = savedDreams
      this.activeDraft = drafts[0] ?? null
      this.loaded = true
    },
    async openDraft(id?: string): Promise<DreamRecord> {
      const repository = await getDreamRepository()
      const requestedId = id?.trim() || undefined

      if (requestedId) {
        const existing = await repository.get(requestedId)
        if (existing) {
          this.activeDraft = existing
          return existing
        }
      } else if (this.activeDraft) {
        return this.activeDraft
      }

      const draft = createDraftDream(requestedId ?? crypto.randomUUID(), new Date())
      this.activeDraft = draft

      try {
        await repository.put(draft)
        this.storageError = null
      } catch (error) {
        this.storageError = '保存失败，内容仍保留在当前页面'
        throw error
      }

      return draft
    },
    async saveDraft(record: DreamRecord): Promise<DreamRecord> {
      const repository = await getDreamRepository()
      const draft = updatedRecord(record, 'draft')
      this.activeDraft = draft

      try {
        await repository.put(draft)
        this.storageError = null
        return draft
      } catch (error) {
        this.storageError = '保存失败，内容仍保留在当前页面'
        throw error
      }
    },
    async publish(record: DreamRecord): Promise<DreamRecord> {
      if (!record.rawText.trim() && record.audioAssetIds.length === 0) {
        throw new Error('请写下一点梦境，或先留下一段录音')
      }

      const repository = await getDreamRepository()
      const saved = updatedRecord(record, 'saved')

      try {
        await repository.put(saved)
      } catch (error) {
        this.activeDraft = record
        this.storageError =
          error instanceof StorageWriteError ? '保存失败，内容仍保留在当前页面' : '保存失败，请稍后再试'
        throw error
      }

      const existingIndex = this.savedDreams.findIndex((dream) => dream.id === saved.id)
      if (existingIndex === -1) {
        this.savedDreams = [saved, ...this.savedDreams]
      } else {
        this.savedDreams.splice(existingIndex, 1, saved)
      }
      this.activeDraft = null
      this.storageError = null
      return saved
    },
    async updateSaved(record: DreamRecord): Promise<DreamRecord> {
      const repository = await getDreamRepository()
      const saved = updatedRecord(record, 'saved')

      try {
        await repository.put(saved)
      } catch (error) {
        this.storageError =
          error instanceof StorageWriteError ? '保存失败，内容仍保留在当前页面' : '保存失败，请稍后再试'
        throw error
      }

      const existingIndex = this.savedDreams.findIndex((dream) => dream.id === saved.id)
      if (existingIndex === -1) {
        this.savedDreams = [saved, ...this.savedDreams]
      } else {
        this.savedDreams.splice(existingIndex, 1, saved)
      }
      this.storageError = null
      return saved
    },
  },
})
