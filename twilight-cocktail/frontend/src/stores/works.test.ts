import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { exportWorkRecords, formatWorkIngredients, importWorkRecords, useWorkStore } from './works'
import * as cloudWorks from '@/services/cloudWorks'
import { useAcademyStore } from '@/stores/academy'
import { useDailyPickStore } from '@/stores/daily'
import { useFavoriteStore } from '@/stores/favorites'
import { usePantryStore } from '@/stores/pantry'

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

  it('loads full cloud account data into local cache', async () => {
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
    vi.spyOn(cloudWorks, 'fetchCloudAppData').mockResolvedValue({
      version: 1,
      app: 'twilight-mixbook',
      type: 'app-data',
      works: [cloudRecord],
      pantry: { ingredientSlugs: ['gin', 'tonic-water'] },
      favorites: { cocktailSlugs: ['mojito'] },
      academy: { completedSlugs: ['tools'] },
      dailyPick: {
        selectedSlug: 'negroni',
        selectedDate: '2026-08-08',
        reason: '今晚适合苦甜风味。',
        rerollCount: 2,
      },
      customOptions: {
        cocktails: [
          {
            value: 'custom:summer',
            slug: 'custom:summer',
            nameZh: '夏夜杯',
            nameEn: '夏夜杯',
            ingredientsText: '饮料：葡萄味气泡水',
            isCustom: true,
            createdAt: '2026-08-08T10:00:00.000Z',
          },
        ],
        flavorLiquors: ['蓝橙力娇酒'],
        beverages: ['水溶C'],
      },
      autoBackup: {
        enabled: true,
        lastBackupAt: '2026-08-08T10:00:00.000Z',
      },
    })
    const works = useWorkStore()
    const pantry = usePantryStore()
    const favorites = useFavoriteStore()
    const academy = useAcademyStore()
    const daily = useDailyPickStore()

    const count = await works.loadFromCloud()

    expect(count).toBe(1)
    expect(works.items).toEqual([cloudRecord])
    expect(pantry.ingredientSlugs).toEqual(['gin', 'tonic-water'])
    expect(favorites.slugs).toEqual(['mojito'])
    expect(academy.completedSlugs).toEqual(['tools'])
    expect(daily.selectedSlug).toBe('negroni')
    expect(daily.rerollCount).toBe(2)
    expect(JSON.parse(window.localStorage.getItem('custom_work_flavor_liquors') ?? '[]')).toEqual([
      '蓝橙力娇酒',
    ])
    expect(JSON.parse(window.localStorage.getItem('custom_work_beverages') ?? '[]')).toEqual([
      '水溶C',
    ])
    expect(
      (
        JSON.parse(window.localStorage.getItem('custom_work_cocktail_options') ?? '[]') as unknown[]
      )[0],
    ).toMatchObject({ nameZh: '夏夜杯' })
    expect(works.cloudSync).toMatchObject({
      status: 'success',
      message: '已从 CloudBase 云端恢复账号数据（作品 1 条）。',
    })
    expect(JSON.parse(window.localStorage.getItem('cocktail_work_records') ?? '[]')).toEqual([
      cloudRecord,
    ])
  })

  it('does not clear local records when cloud restore finds no account data', async () => {
    vi.spyOn(cloudWorks, 'fetchCloudAppData').mockResolvedValue({
      version: 1,
      app: 'twilight-mixbook',
      type: 'app-data',
      works: [],
      pantry: { ingredientSlugs: [] },
      favorites: { cocktailSlugs: [] },
      academy: { completedSlugs: [] },
      dailyPick: { selectedSlug: '', selectedDate: '', reason: '', rerollCount: 0 },
      customOptions: { cocktails: [], flavorLiquors: [], beverages: [] },
      autoBackup: { enabled: false, lastBackupAt: '' },
    })
    const works = useWorkStore()
    const localRecord = works.add({
      madeAt: '2026-08-03',
      cocktailSlug: '',
      cocktailName: '本地作品',
      photoDataUrl: '',
      ingredientsText: '饮料：苏打水',
      rating: 0,
      mood: '',
      selfReview: '',
      notes: '',
    })

    const count = await works.loadFromCloud()

    expect(count).toBe(0)
    expect(works.items).toEqual([localRecord])
    expect(works.cloudSync).toMatchObject({
      status: 'success',
      message: '云端目前没有账号数据，未恢复到本地。',
    })
  })

  it('pushes full local account data to cloud', async () => {
    const push = vi.spyOn(cloudWorks, 'syncCloudAppData').mockResolvedValue(undefined)
    const works = useWorkStore()
    const pantry = usePantryStore()
    const favorites = useFavoriteStore()
    const academy = useAcademyStore()
    const daily = useDailyPickStore()
    pantry.add('gin')
    favorites.slugs = ['mojito']
    window.localStorage.setItem('favorite_cocktail_slugs', JSON.stringify(favorites.slugs))
    academy.toggle('tools')
    daily.selectedSlug = 'negroni'
    daily.selectedDate = '2026-08-08'
    daily.reason = '今晚适合苦甜风味。'
    daily.rerollCount = 2
    window.localStorage.setItem('daily_pick_slug', daily.selectedSlug)
    window.localStorage.setItem('daily_pick_date', daily.selectedDate)
    window.localStorage.setItem('daily_pick_reason', daily.reason)
    window.localStorage.setItem('daily_pick_reroll_count', String(daily.rerollCount))
    window.localStorage.setItem('custom_work_flavor_liquors', JSON.stringify(['蓝橙力娇酒']))
    window.localStorage.setItem('custom_work_beverages', JSON.stringify(['水溶C']))
    window.localStorage.setItem(
      'custom_work_cocktail_options',
      JSON.stringify([
        {
          value: 'custom:summer',
          slug: 'custom:summer',
          nameZh: '夏夜杯',
          nameEn: '夏夜杯',
          ingredientsText: '饮料：葡萄味气泡水',
          isCustom: true,
          createdAt: '2026-08-08T10:00:00.000Z',
        },
      ]),
    )
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
    expect(works.cloudSync).toMatchObject({
      status: 'success',
      message: '已上传完整账号数据到 CloudBase 云端（作品 1 条）。',
    })
    expect(push).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'app-data',
        works: works.items,
        pantry: { ingredientSlugs: ['gin'] },
        favorites: { cocktailSlugs: ['mojito'] },
        academy: { completedSlugs: ['tools'] },
        dailyPick: {
          selectedSlug: 'negroni',
          selectedDate: '2026-08-08',
          reason: '今晚适合苦甜风味。',
          rerollCount: 2,
        },
        customOptions: expect.objectContaining({
          flavorLiquors: ['蓝橙力娇酒'],
          beverages: ['水溶C'],
        }),
        autoBackup: expect.objectContaining({
          lastBackupAt: expect.any(String),
        }),
      }),
    )
  })

  it('persists automatic cloud backup settings', () => {
    const works = useWorkStore()

    expect(works.autoBackup).toEqual({
      enabled: false,
      lastBackupAt: '',
    })

    works.setAutoBackupEnabled(true)

    expect(works.autoBackup.enabled).toBe(true)
    expect(JSON.parse(window.localStorage.getItem('cocktail_work_auto_backup') ?? '{}')).toEqual({
      enabled: true,
      lastBackupAt: '',
    })

    setActivePinia(createPinia())
    const restored = useWorkStore()

    expect(restored.autoBackup.enabled).toBe(true)
  })

  it('detects when automatic cloud backup is due', () => {
    window.localStorage.setItem(
      'twilight_cloud_works_session',
      JSON.stringify({
        accountName: 'mix',
        accountNameKey: 'account-key',
        passwordVerifier: 'password-verifier',
        updatedAt: '2026-08-05T00:00:00.000Z',
      }),
    )
    window.localStorage.setItem(
      'cocktail_work_auto_backup',
      JSON.stringify({
        enabled: true,
        lastBackupAt: '2026-08-06T00:00:00.000Z',
      }),
    )
    const works = useWorkStore()
    works.add({
      madeAt: '2026-08-06',
      cocktailSlug: '',
      cocktailName: '自动备份作品',
      photoDataUrl: '',
      ingredientsText: '饮料：苏打水',
      rating: 0,
      mood: '',
      selfReview: '',
      notes: '',
    })

    expect(works.shouldPromptAutoCloudBackup(new Date('2026-08-06T23:59:59.000Z'))).toBe(false)
    expect(works.shouldPromptAutoCloudBackup(new Date('2026-08-07T00:00:01.000Z'))).toBe(true)
  })

  it('detects automatic cloud backup as due when only non-work account data exists', () => {
    window.localStorage.setItem(
      'twilight_cloud_works_session',
      JSON.stringify({
        accountName: 'mix',
        accountNameKey: 'account-key',
        passwordVerifier: 'password-verifier',
        updatedAt: '2026-08-05T00:00:00.000Z',
      }),
    )
    window.localStorage.setItem(
      'cocktail_work_auto_backup',
      JSON.stringify({
        enabled: true,
        lastBackupAt: '2026-08-06T00:00:00.000Z',
      }),
    )
    window.localStorage.setItem('pantry_ingredient_slugs', JSON.stringify(['gin']))
    const works = useWorkStore()

    expect(works.shouldPromptAutoCloudBackup(new Date('2026-08-07T00:00:01.000Z'))).toBe(true)
  })

  it('records last successful cloud backup time after pushing to cloud', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-07T09:30:00.000Z'))
    const push = vi.spyOn(cloudWorks, 'syncCloudAppData').mockResolvedValue(undefined)
    const works = useWorkStore()
    works.setAutoBackupEnabled(true)
    works.add({
      madeAt: '2026-08-07',
      cocktailSlug: '',
      cocktailName: '已备份作品',
      photoDataUrl: '',
      ingredientsText: '饮料：苏打水',
      rating: 0,
      mood: '',
      selfReview: '',
      notes: '',
    })

    try {
      await works.pushAllToCloud()

      expect(push).toHaveBeenCalledWith(
        expect.objectContaining({
          autoBackup: {
            enabled: true,
            lastBackupAt: '2026-08-07T09:30:00.000Z',
          },
        }),
      )
      expect(works.autoBackup.lastBackupAt).toBe('2026-08-07T09:30:00.000Z')
      expect(JSON.parse(window.localStorage.getItem('cocktail_work_auto_backup') ?? '{}')).toEqual({
        enabled: true,
        lastBackupAt: '2026-08-07T09:30:00.000Z',
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps cloud sync errors visible in store state', async () => {
    vi.spyOn(cloudWorks, 'syncCloudAppData').mockRejectedValue(new Error('权限不足'))
    const works = useWorkStore()
    works.add({
      madeAt: '2026-08-03',
      cocktailSlug: '',
      cocktailName: '同步失败作品',
      photoDataUrl: '',
      ingredientsText: '饮料：苏打水',
      rating: 0,
      mood: '',
      selfReview: '',
      notes: '',
    })

    await expect(works.pushAllToCloud()).rejects.toThrow('权限不足')

    expect(works.cloudSync).toMatchObject({
      status: 'error',
      message: '权限不足',
    })
  })
})
