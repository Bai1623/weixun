import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { StorageWriteError } from '@/core/persistence/db'

import { createDraftDream, type DreamRecord } from '../model/dream'
import { useDreamsStore } from './dreams'

const repository = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  listSaved: vi.fn(),
  getDrafts: vi.fn(),
  deleteWithMedia: vi.fn(),
}))

vi.mock('@/core/persistence/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/persistence/db')>()
  return { ...actual, openShimengDb: vi.fn(async () => ({})) }
})

vi.mock('../data/dreamRepository', () => ({
  createDreamRepository: () => repository,
}))

function savedDream(id: string, rawText: string): DreamRecord {
  return {
    ...createDraftDream(id, new Date('2026-08-25T00:00:00.000Z')),
    status: 'saved',
    rawText,
  }
}

describe('dreams store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    repository.listSaved.mockResolvedValue([])
    repository.getDrafts.mockResolvedValue([])
    repository.get.mockResolvedValue(undefined)
    repository.put.mockResolvedValue(undefined)
  })

  it('loads saved dreams and restores the most recent draft after refresh', async () => {
    const saved = savedDream('saved-1', '我沿着水面走向一扇门')
    const draft = createDraftDream('draft-1', new Date('2026-08-25T01:00:00.000Z'))
    repository.listSaved.mockResolvedValue([saved])
    repository.getDrafts.mockResolvedValue([draft])

    const store = useDreamsStore()
    await store.load()

    expect(store.savedDreams).toEqual([saved])
    expect(store.activeDraft).toEqual(draft)
  })

  it('publishes a titleless text dream and removes its draft state', async () => {
    const draft = {
      ...createDraftDream('draft-1', new Date('2026-08-25T01:00:00.000Z')),
      rawText: '我沿着水面走向一扇门',
    }
    const store = useDreamsStore()
    store.activeDraft = draft

    const saved = await store.publish(draft)

    expect(saved).toMatchObject({ id: draft.id, title: null, status: 'saved' })
    expect(repository.put).toHaveBeenCalledWith(saved)
    expect(store.activeDraft).toBeNull()
    expect(store.savedDreams).toEqual([saved])
  })

  it('rejects an empty dream that has neither text nor a recording', async () => {
    const store = useDreamsStore()
    const draft = createDraftDream('draft-1', new Date('2026-08-25T01:00:00.000Z'))

    await expect(store.publish(draft)).rejects.toThrow('请写下一点梦境，或先留下一段录音')
    expect(repository.put).not.toHaveBeenCalled()
  })

  it('keeps the active draft and exposes a durable warning when persistence fails', async () => {
    const store = useDreamsStore()
    const draft = {
      ...createDraftDream('draft-1', new Date('2026-08-25T01:00:00.000Z')),
      rawText: '不能丢失的梦境文字',
    }
    const failure = new StorageWriteError(new DOMException('full', 'QuotaExceededError'))
    repository.put.mockRejectedValue(failure)
    store.activeDraft = draft

    await expect(store.saveDraft(draft)).rejects.toBe(failure)
    expect(store.activeDraft?.rawText).toBe('不能丢失的梦境文字')
    expect(store.storageError).toBe('保存失败，内容仍保留在当前页面')
  })
})
