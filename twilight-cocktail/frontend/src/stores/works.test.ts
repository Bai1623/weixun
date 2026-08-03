import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { exportWorkRecords, formatWorkIngredients, importWorkRecords, useWorkStore } from './works'
import * as cloudWorks from '@/services/cloudWorks'

describe('work store', () => {
  beforeEach(() => {
    window.localStorage.clear()
    setActivePinia(createPinia())
  })

  it('persists daily cocktail work records locally', () => {
    const works = useWorkStore()

    works.add({
      madeAt: '2026-07-30',
      cocktailSlug: 'xiang-jian-ni',
      cocktailName: '想见你',
      photoDataUrl: 'data:image/png;base64,abc',
      ingredientsText: '伏特加 30ml\n葡萄气泡水 120ml',
      rating: 5,
      mood: '清爽',
      selfReview: '气泡感很好，下次少一点酸。',
      notes: '晚饭后做的。',
    })

    expect(works.items).toHaveLength(1)
    expect(works.items[0]).toMatchObject({
      madeAt: '2026-07-30',
      cocktailName: '想见你',
      rating: 5,
      photoDataUrl: 'data:image/png;base64,abc',
    })

    setActivePinia(createPinia())
    const restored = useWorkStore()
    expect(restored.items).toHaveLength(1)
    expect(restored.items[0].ingredientsText).toContain('葡萄气泡水')
  })

  it('persists structured ingredient groups for work records', () => {
    const works = useWorkStore()

    works.add({
      madeAt: '2026-07-29',
      cocktailSlug: 'xiang-jian-ni',
      cocktailName: '想见你',
      photoDataUrl: '',
      ingredientsText: '',
      ingredientGroups: {
        baseLiquors: ['伏特加', '金酒'],
        flavorLiquors: ['蓝橙力娇酒'],
        beverages: ['葡萄味气泡水', '水溶C'],
        other: '冰块\n柠檬片',
      },
      rating: 0,
      mood: '',
      selfReview: '',
      notes: '',
    })

    expect(works.items[0].ingredientGroups).toEqual({
      baseLiquors: ['伏特加', '金酒'],
      flavorLiquors: ['蓝橙力娇酒'],
      beverages: ['葡萄味气泡水', '水溶C'],
      other: '冰块\n柠檬片',
    })
    expect(formatWorkIngredients(works.items[0])).toContain('基酒：伏特加、金酒')
    expect(formatWorkIngredients(works.items[0])).toContain('饮料：葡萄味气泡水、水溶C')

    setActivePinia(createPinia())
    const restored = useWorkStore()
    expect(restored.items[0].ingredientGroups?.baseLiquors).toEqual(['伏特加', '金酒'])
  })

  it('keeps older free-text ingredient records readable', () => {
    window.localStorage.setItem(
      'cocktail_work_records',
      JSON.stringify([
        {
          id: 'legacy-work',
          madeAt: '2026-07-28',
          cocktailSlug: '',
          cocktailName: '旧记录',
          photoDataUrl: '',
          ingredientsText: '金酒、汤力水',
          rating: 0,
          mood: '',
          selfReview: '',
          notes: '',
          createdAt: '2026-07-28T12:00:00.000Z',
        },
      ]),
    )

    const works = useWorkStore()

    expect(works.items).toHaveLength(1)
    expect(formatWorkIngredients(works.items[0])).toBe('金酒、汤力水')
  })

  it('fills safe defaults for early local work records', () => {
    window.localStorage.setItem(
      'cocktail_work_records',
      JSON.stringify([
        {
          id: 'early-work',
          madeAt: '2026-07-20',
          cocktailName: '早期作品',
          ingredientsText: '朗姆酒、可乐',
          createdAt: '2026-07-20T12:00:00.000Z',
        },
      ]),
    )

    const works = useWorkStore()

    expect(works.items[0]).toMatchObject({
      cocktailSlug: '',
      photoDataUrl: '',
      rating: 0,
      mood: '',
      selfReview: '',
      notes: '',
    })
  })

  it('removes a work record from local storage', () => {
    const works = useWorkStore()
    const item = works.add({
      madeAt: '2026-07-30',
      cocktailSlug: '',
      cocktailName: '自由特调',
      photoDataUrl: '',
      ingredientsText: '金酒、汤力水',
      rating: 4,
      mood: '',
      selfReview: '',
      notes: '',
    })

    works.remove(item.id)

    expect(works.items).toHaveLength(0)
    expect(window.localStorage.getItem('cocktail_work_records')).toBe('[]')
  })

  it('updates an existing work record without changing its identity', () => {
    const works = useWorkStore()
    const item = works.add({
      madeAt: '2026-07-30',
      cocktailSlug: '',
      cocktailName: '自由特调',
      photoDataUrl: '',
      ingredientsText: '金酒、汤力水',
      ingredientGroups: {
        baseLiquors: ['金酒'],
        flavorLiquors: [],
        beverages: ['汤力水'],
        other: '',
      },
      rating: 4,
      mood: '',
      selfReview: '',
      notes: '',
    })

    const updated = works.update(item.id, {
      madeAt: '2026-08-01',
      cocktailSlug: 'custom',
      cocktailName: '修改后的作品',
      photoDataUrl: 'data:image/png;base64,next',
      ingredientsText: '',
      ingredientGroups: {
        baseLiquors: ['伏特加'],
        flavorLiquors: ['蓝橙力娇酒'],
        beverages: ['葡萄味气泡水'],
        other: '冰块',
      },
      rating: 5,
      mood: '酸甜',
      selfReview: '这次比例更好。',
      notes: '周末补记。',
    })

    expect(updated?.id).toBe(item.id)
    expect(updated?.createdAt).toBe(item.createdAt)
    expect(works.items).toHaveLength(1)
    expect(works.items[0]).toMatchObject({
      id: item.id,
      madeAt: '2026-08-01',
      cocktailName: '修改后的作品',
      rating: 5,
      mood: '酸甜',
    })
    expect(formatWorkIngredients(works.items[0])).toContain('基酒：伏特加')

    setActivePinia(createPinia())
    const restored = useWorkStore()
    expect(restored.items[0].cocktailName).toBe('修改后的作品')
  })

  it('does not mutate in-memory records when local persistence fails', () => {
    const works = useWorkStore()
    const item = works.add({
      madeAt: '2026-07-30',
      cocktailSlug: '',
      cocktailName: '自由特调',
      photoDataUrl: '',
      ingredientsText: '金酒、汤力水',
      rating: 4,
      mood: '',
      selfReview: '',
      notes: '',
    })
    const setItem = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    })

    try {
      expect(() =>
        works.update(item.id, {
          madeAt: '2026-08-01',
          cocktailSlug: '',
          cocktailName: '未能保存的修改',
          photoDataUrl: 'data:image/jpeg;base64,large',
          ingredientsText: '饮料：葡萄味气泡水',
          rating: 5,
          mood: '',
          selfReview: '',
          notes: '',
        }),
      ).toThrow('Quota exceeded')
      expect(works.items[0].cocktailName).toBe('自由特调')
    } finally {
      setItem.mockRestore()
    }
  })

  it('exports work records as a versioned JSON document', () => {
    const works = useWorkStore()
    works.add({
      madeAt: '2026-08-02',
      cocktailSlug: '',
      cocktailName: '分享用作品',
      photoDataUrl: '',
      ingredientsText: '基酒：金酒',
      rating: 5,
      mood: '',
      selfReview: '',
      notes: '',
    })

    const exported = JSON.parse(exportWorkRecords(works.items)) as {
      version: number
      records: unknown[]
    }

    expect(exported.version).toBe(1)
    expect(exported.records).toHaveLength(1)
    expect(exported.records[0]).toMatchObject({ cocktailName: '分享用作品' })
  })

  it('imports valid work records and skips duplicate ids', () => {
    const works = useWorkStore()
    const existing = works.add({
      madeAt: '2026-08-01',
      cocktailSlug: '',
      cocktailName: '已有作品',
      photoDataUrl: '',
      ingredientsText: '基酒：伏特加',
      rating: 4,
      mood: '',
      selfReview: '',
      notes: '',
    })

    const result = works.importFromJson(
      JSON.stringify({
        version: 1,
        records: [
          existing,
          {
            id: 'friend-work',
            madeAt: '2026-08-02',
            cocktailSlug: '',
            cocktailName: '朋友作品',
            photoDataUrl: '',
            ingredientsText: '基酒：朗姆酒',
            rating: 5,
            mood: '清爽',
            selfReview: '',
            notes: '',
            createdAt: '2026-08-02T10:00:00.000Z',
          },
        ],
      }),
    )

    expect(result).toEqual({ importedCount: 1, skippedCount: 1 })
    expect(works.items).toHaveLength(2)
    expect(works.items[0].cocktailName).toBe('朋友作品')

    expect(importWorkRecords('{bad json')).toEqual({ records: [], skippedCount: 0 })
  })

  it('loads cloud work records into local cache', async () => {
    const cloudRecord = {
      id: 'cloud-work',
      madeAt: '2026-08-03',
      cocktailSlug: '',
      cocktailName: '云端作品',
      photoDataUrl: '',
      ingredientsText: '基酒：金酒',
      rating: 5,
      mood: '',
      selfReview: '',
      notes: '',
      createdAt: '2026-08-03T10:00:00.000Z',
    }
    vi.spyOn(cloudWorks, 'fetchCloudWorks').mockResolvedValue([cloudRecord])
    const works = useWorkStore()

    const count = await works.loadFromCloud()

    expect(count).toBe(1)
    expect(works.items).toEqual([cloudRecord])
    expect(JSON.parse(window.localStorage.getItem('cocktail_work_records') ?? '[]')).toEqual([
      cloudRecord,
    ])
  })

  it('pushes current local work records to cloud', async () => {
    const push = vi.spyOn(cloudWorks, 'syncCloudWorks').mockResolvedValue(undefined)
    const works = useWorkStore()
    works.add({
      madeAt: '2026-08-03',
      cocktailSlug: '',
      cocktailName: '待迁移作品',
      photoDataUrl: '',
      ingredientsText: '饮料：苏打水',
      rating: 0,
      mood: '',
      selfReview: '',
      notes: '',
    })

    const count = await works.pushAllToCloud()

    expect(count).toBe(1)
    expect(push).toHaveBeenCalledWith(works.items)
  })
})
