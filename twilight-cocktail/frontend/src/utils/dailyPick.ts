import type { Cocktail } from '@/types/cocktail'

const hashString = (value: string): number => {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export const getTodayKey = (date = new Date()): string => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const selectDailyCocktail = (
  candidates: readonly Cocktail[],
  userKey: string,
  date = new Date(),
): Cocktail => {
  if (candidates.length === 0) {
    throw new Error('Cannot select a daily cocktail from an empty candidate list.')
  }

  const eligible = candidates.filter(
    (cocktail) => cocktail.beginnerFriendly || cocktail.difficulty === 'easy',
  )
  const pool = eligible.length > 0 ? eligible : candidates
  const totalWeight = pool.reduce((sum, cocktail) => sum + cocktail.popularityWeight, 0)
  const seed = hashString(`${userKey}:${getTodayKey(date)}`)
  const target = (seed / 0xffffffff) * totalWeight
  let cursor = 0

  for (const cocktail of pool) {
    cursor += cocktail.popularityWeight
    if (target <= cursor) {
      return cocktail
    }
  }

  const fallback = pool[pool.length - 1]
  if (!fallback) {
    throw new Error('Cannot select a daily cocktail from an empty candidate list.')
  }
  return fallback
}

export const selectAlternateDailyCocktail = (
  candidates: readonly Cocktail[],
  userKey: string,
  previousSlug: string,
  rerollCount: number,
  date = new Date(),
): Cocktail => {
  const selected = selectDailyCocktail(candidates, `${userKey}:reroll:${rerollCount}`, date)
  if (selected.slug !== previousSlug || candidates.length <= 1) return selected

  const nextCandidate = candidates.find((cocktail) => cocktail.slug !== previousSlug)
  if (!nextCandidate) return selected

  for (let attempt = 1; attempt <= candidates.length * 2; attempt += 1) {
    const next = selectDailyCocktail(candidates, `${userKey}:reroll:${rerollCount + attempt}`, date)
    if (next.slug !== previousSlug) return next
  }

  return nextCandidate
}

export const getWheelRotationForIndex = (index: number, total: number, spins = 5): number => {
  if (total <= 0) {
    throw new Error('Wheel total must be greater than zero.')
  }
  const normalizedIndex = ((index % total) + total) % total
  const segment = 360 / total
  return spins * 360 + normalizedIndex * segment + segment / 2
}
