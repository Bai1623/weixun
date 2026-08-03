import { describe, expect, it } from 'vitest'

import type { WorkRecord } from '@/stores/works'
import {
  CLOUD_WORKS_COLLECTION,
  createCloudWorkDocument,
  getCloudbaseEnvId,
  toCloudWorkWriteData,
  toWorkRecordFromCloudDocument,
} from './cloudWorks'

const record: WorkRecord = {
  id: 'work-1',
  madeAt: '2026-08-03',
  cocktailSlug: 'mojito',
  cocktailName: '莫吉托',
  photoDataUrl: 'data:image/jpeg;base64,abc',
  ingredientsText: '基酒：朗姆酒',
  ingredientGroups: {
    baseLiquors: ['朗姆酒'],
    flavorLiquors: [],
    beverages: ['苏打水'],
    other: '薄荷叶',
  },
  rating: 5,
  mood: '清爽',
  selfReview: '比例不错',
  notes: '周末补记',
  createdAt: '2026-08-03T12:00:00.000Z',
}

describe('cloud works service', () => {
  it('uses the configured CloudBase environment and collection', () => {
    expect(getCloudbaseEnvId()).toBe('weixun-d8g9xwqak83952747')
    expect(CLOUD_WORKS_COLLECTION).toBe('works')
  })

  it('serializes work records with owner and timestamps for cloud storage', () => {
    expect(createCloudWorkDocument(record, 'user-1')).toEqual({
      _id: 'work-1',
      ownerId: 'user-1',
      madeAt: '2026-08-03',
      cocktailSlug: 'mojito',
      cocktailName: '莫吉托',
      photoDataUrl: 'data:image/jpeg;base64,abc',
      photoFileId: '',
      ingredientsText: '基酒：朗姆酒',
      ingredientGroups: record.ingredientGroups,
      rating: 5,
      mood: '清爽',
      selfReview: '比例不错',
      notes: '周末补记',
      createdAt: '2026-08-03T12:00:00.000Z',
      updatedAt: expect.any(String),
    })
  })

  it('omits document id from set payload when writing by document id', () => {
    const writeData = toCloudWorkWriteData(createCloudWorkDocument(record, 'user-1'))

    expect(writeData).not.toHaveProperty('_id')
    expect(writeData).toMatchObject({
      ownerId: 'user-1',
      cocktailName: '莫吉托',
    })
  })

  it('normalizes cloud documents back to local work records', () => {
    expect(
      toWorkRecordFromCloudDocument({
        ...createCloudWorkDocument(record, 'user-1'),
        _id: 'cloud-id',
      }),
    ).toMatchObject({
      id: 'cloud-id',
      madeAt: '2026-08-03',
      cocktailName: '莫吉托',
      ingredientGroups: record.ingredientGroups,
      rating: 5,
    })
  })
})
