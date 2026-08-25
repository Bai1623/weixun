import { describe, expect, it } from 'vitest'

import { createDraftDream, type DreamRecord } from '../model/dream'
import { emptyDreamFilters, filterDreams, type DreamFiltersValue } from './filterDreams'

function dream(overrides: Partial<DreamRecord> & Pick<DreamRecord, 'id'>): DreamRecord {
  return {
    ...createDraftDream(overrides.id, new Date('2026-08-25T00:00:00.000Z')),
    status: 'saved',
    ...overrides,
  }
}

const dreams = [
  dream({
    id: 'door',
    title: '雾里的门',
    rawText: '我沿着水面走',
    summary: '一次安静的远行',
    tags: ['月亮', '海水'],
    mood: 'mysterious',
    clarity: 4,
    lucid: true,
    favorite: true,
  }),
  dream({
    id: 'garden',
    title: '旧日花园',
    rawText: 'RED FLOWERS everywhere',
    tags: ['童年'],
    mood: 'joyful',
    clarity: 2,
  }),
]

describe('filterDreams', () => {
  it.each([
    ['标题', '雾里的门', 'door'],
    ['原文', 'red flowers', 'garden'],
    ['摘要', '安静的远行', 'door'],
    ['标签', '童年', 'garden'],
  ])('searches %s case-insensitively', (_field, query, expectedId) => {
    expect(filterDreams(dreams, { ...emptyDreamFilters, query }).map(({ id }) => id)).toEqual([
      expectedId,
    ])
  })

  it('combines every active structured filter conjunctively', () => {
    const filters: DreamFiltersValue = {
      query: '门',
      moods: ['mysterious'],
      clarity: [4, 5],
      lucidOnly: true,
      favoriteOnly: true,
    }

    expect(filterDreams(dreams, filters)).toEqual([dreams[0]])
    expect(filterDreams(dreams, { ...filters, moods: ['joyful'] })).toEqual([])
  })
})
