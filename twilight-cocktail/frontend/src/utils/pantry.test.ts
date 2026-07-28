import { describe, expect, it } from 'vitest'

import { cocktails } from '@/data/cocktails'
import { getPantryMatches } from './pantry'

describe('pantry matching', () => {
  it('marks cocktails ready when all required ingredients are owned', () => {
    const matches = getPantryMatches(cocktails, ['gin', 'tonic-water'])

    expect(matches.ready.some((item) => item.slug === 'gin-tonic')).toBe(true)
  })

  it('marks cocktails missing one when exactly one required ingredient is absent', () => {
    const matches = getPantryMatches(cocktails, ['gin'])

    expect(matches.missingOne.some((item) => item.slug === 'gin-tonic')).toBe(true)
  })

  it('does not block readiness when only garnish is missing', () => {
    const matches = getPantryMatches(cocktails, ['gin', 'tonic-water'])
    const ginTonic = matches.ready.find((item) => item.slug === 'gin-tonic')

    expect(ginTonic?.optionalMissing).toContain('青柠角')
  })
})
