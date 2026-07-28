import { describe, expect, it } from 'vitest'

import { cocktails } from '@/data/cocktails'
import {
  getTodayKey,
  getWheelRotationForIndex,
  selectAlternateDailyCocktail,
  selectDailyCocktail,
} from './dailyPick'

describe('daily pick utilities', () => {
  it('returns the same cocktail for the same user and date', () => {
    const date = new Date('2026-07-28T09:00:00+08:00')

    const first = selectDailyCocktail(cocktails, 'anonymous-user-1', date)
    const second = selectDailyCocktail(cocktails, 'anonymous-user-1', date)

    expect(first.slug).toBe(second.slug)
  })

  it('formats dates as local calendar keys', () => {
    expect(getTodayKey(new Date('2026-07-28T09:00:00+08:00'))).toBe('2026-07-28')
  })

  it('maps selected index to the center of its wheel segment', () => {
    const rotation = getWheelRotationForIndex(2, 12, 4)
    const segment = 360 / 12

    expect(rotation).toBeCloseTo(4 * 360 + 2 * segment + segment / 2)
  })

  it('selects a different cocktail when rerolling with alternatives available', () => {
    const date = new Date('2026-07-28T09:00:00+08:00')
    const previous = cocktails[0]
    const next = selectAlternateDailyCocktail(cocktails, 'anonymous-user-1', previous.slug, 1, date)

    expect(next.slug).not.toBe(previous.slug)
  })
})
