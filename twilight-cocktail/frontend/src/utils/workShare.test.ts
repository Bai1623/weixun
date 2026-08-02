import { describe, expect, it } from 'vitest'

import type { WorkRecord } from '@/stores/works'
import {
  filterWorkRecords,
  getWorkExportBatches,
  getWorkLongImageText,
  hasActiveWorkFilters,
} from './workShare'

const createRecord = (overrides: Partial<WorkRecord>): WorkRecord => ({
  id: overrides.id ?? 'work',
  madeAt: overrides.madeAt ?? '2026-08-01',
  cocktailSlug: '',
  cocktailName: overrides.cocktailName ?? '测试作品',
  photoDataUrl: '',
  ingredientsText: overrides.ingredientsText ?? '',
  ingredientGroups: overrides.ingredientGroups,
  rating: overrides.rating ?? 0,
  mood: '',
  selfReview: overrides.selfReview ?? '',
  notes: overrides.notes ?? '',
  createdAt: '2026-08-01T12:00:00.000Z',
})

describe('work share helpers', () => {
  it('filters work records by date range, base liquor and minimum rating', () => {
    const records = [
      createRecord({
        id: 'gin-high',
        madeAt: '2026-08-01',
        cocktailName: '金酒高分',
        ingredientGroups: {
          baseLiquors: ['金酒'],
          flavorLiquors: [],
          beverages: [],
          other: '',
        },
        rating: 5,
      }),
      createRecord({
        id: 'gin-low',
        madeAt: '2026-08-02',
        cocktailName: '金酒低分',
        ingredientGroups: {
          baseLiquors: ['金酒'],
          flavorLiquors: [],
          beverages: [],
          other: '',
        },
        rating: 2,
      }),
      createRecord({
        id: 'vodka-high',
        madeAt: '2026-08-03',
        cocktailName: '伏特加高分',
        ingredientGroups: {
          baseLiquors: ['伏特加'],
          flavorLiquors: [],
          beverages: [],
          other: '',
        },
        rating: 5,
      }),
    ]

    const filtered = filterWorkRecords(records, {
      startDate: '2026-08-01',
      endDate: '2026-08-02',
      baseLiquor: '金酒',
      minRating: 4,
    })

    expect(filtered.map((item) => item.id)).toEqual(['gin-high'])
  })

  it('detects active filters and splits long-image export into batches of ten records', () => {
    const records = Array.from({ length: 23 }, (_, index) =>
      createRecord({ id: `work-${index + 1}`, cocktailName: `作品 ${index + 1}` }),
    )

    expect(hasActiveWorkFilters({ startDate: '', endDate: '', baseLiquor: '', minRating: 0 })).toBe(
      false,
    )
    expect(
      hasActiveWorkFilters({ startDate: '', endDate: '', baseLiquor: '金酒', minRating: 0 }),
    ).toBe(true)
    expect(getWorkExportBatches(records).map((batch) => batch.length)).toEqual([10, 10, 3])
  })

  it('never includes notes in long-image export text', () => {
    const record = createRecord({
      ingredientsText: '饮料：葡萄味气泡水',
      selfReview: '复盘可以选择导出',
      notes: '备注不应该出现在长图里',
    })

    expect(getWorkLongImageText(record, { includeSelfReview: true })).toEqual([
      '饮料：葡萄味气泡水',
      '复盘可以选择导出',
    ])
    expect(getWorkLongImageText(record, { includeSelfReview: false })).toEqual([
      '饮料：葡萄味气泡水',
    ])
  })
})
