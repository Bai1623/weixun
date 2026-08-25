import { describe, expect, it } from 'vitest'

import { createDraftDream } from '../model/dream'
import { createCoverScene } from './coverScene'

const dream = {
  ...createDraftDream('dream-1', new Date('2026-08-25T00:00:00.000Z')),
  status: 'saved' as const,
  rawText: '水面尽头有一扇门',
}

describe('createCoverScene', () => {
  it('derives the same scene from the same dream without network assets', () => {
    expect(createCoverScene(dream)).toEqual(createCoverScene(structuredClone(dream)))
  })

  it('changes fine-grained stars when the cover seed changes', () => {
    const other = createCoverScene({ ...dream, id: 'other', coverSeed: 'other' })
    expect(other.stars).not.toEqual(createCoverScene(dream).stars)
  })

  it('uses the deep night palette for fearful dreams', () => {
    const scene = createCoverScene({ ...dream, mood: 'fearful' })
    expect(scene.sky).toEqual(['#151827', '#393d57'])
    expect(scene.water).toEqual(['#25293d', '#090b14'])
  })

  it('makes a vague dream foggier than a clear dream', () => {
    const vague = createCoverScene({ ...dream, clarity: 1 })
    const clear = createCoverScene({ ...dream, clarity: 5 })
    expect(vague.fogOpacity).toBeGreaterThan(clear.fogOpacity)
  })
})
