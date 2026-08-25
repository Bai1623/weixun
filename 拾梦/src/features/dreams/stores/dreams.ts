import { defineStore } from 'pinia'

import { openShimengDb, StorageWriteError } from '@/core/persistence/db'

import { createDreamRepository, type DreamRepository } from '../data/dreamRepository'
import { createDraftDream, type DreamRecord } from '../model/dream'

let repositoryPromise: Promise<DreamRepository> | undefined
const deletionTimers = new Map<string, ReturnType<typeof setTimeout>>()

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
    pendingDeletions: {} as Record<string, DreamRecord>,
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
    async toggleFavorite(id: string): Promise<DreamRecord | undefined> {
      const dream = this.savedDreams.find((record) => record.id === id)
      if (!dream) return undefined
      return this.updateSaved({ ...dream, favorite: !dream.favorite })
    },
    scheduleDelete(id: string, delay = 8_000): void {
      const dream = this.savedDreams.find((record) => record.id === id)
      if (!dream) return

      const existingTimer = deletionTimers.get(id)
      if (existingTimer) clearTimeout(existingTimer)
      this.savedDreams = this.savedDreams.filter((record) => record.id !== id)
      this.pendingDeletions = { ...this.pendingDeletions, [id]: dream }

      const timer = setTimeout(async () => {
        deletionTimers.delete(id)
        try {
          const repository = await getDreamRepository()
          await repository.deleteWithMedia(id)
          const remaining = { ...this.pendingDeletions }
          delete remaining[id]
          this.pendingDeletions = remaining
        } catch {
          const pending = this.pendingDeletions[id]
          if (pending) this.savedDreams = [pending, ...this.savedDreams]
          const remaining = { ...this.pendingDeletions }
          delete remaining[id]
          this.pendingDeletions = remaining
          this.storageError = '删除失败，梦境仍保留在本机'
        }
      }, delay)
      deletionTimers.set(id, timer)
    },
    undoDelete(id: string): void {
      const timer = deletionTimers.get(id)
      if (timer) clearTimeout(timer)
      deletionTimers.delete(id)

      const dream = this.pendingDeletions[id]
      if (!dream) return
      this.savedDreams = [dream, ...this.savedDreams].sort(
        (first, second) =>
          second.dreamedAt.localeCompare(first.dreamedAt) || second.createdAt.localeCompare(first.createdAt),
      )
      const remaining = { ...this.pendingDeletions }
      delete remaining[id]
      this.pendingDeletions = remaining
    },
  },
})
