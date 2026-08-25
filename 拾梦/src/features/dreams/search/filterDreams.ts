import type { DreamClarity, DreamMood, DreamRecord } from '../model/dream'

export interface DreamFiltersValue {
  query: string
  moods: DreamMood[]
  clarity: DreamClarity[]
  lucidOnly: boolean
  favoriteOnly: boolean
}

export const emptyDreamFilters: DreamFiltersValue = {
  query: '',
  moods: [],
  clarity: [],
  lucidOnly: false,
  favoriteOnly: false,
}

function normalize(value: string): string {
  return value.toLocaleLowerCase('zh-CN')
}

export function filterDreams(dreams: DreamRecord[], filters: DreamFiltersValue): DreamRecord[] {
  const query = normalize(filters.query.trim())

  return dreams.filter((dream) => {
    const matchesQuery =
      !query ||
      normalize(
        [dream.title, dream.rawText, dream.summary, ...dream.tags]
          .filter((value): value is string => Boolean(value))
          .join(' '),
      ).includes(query)
    const matchesMood = !filters.moods.length || filters.moods.includes(dream.mood)
    const matchesClarity = !filters.clarity.length || filters.clarity.includes(dream.clarity)
    const matchesLucid = !filters.lucidOnly || dream.lucid
    const matchesFavorite = !filters.favoriteOnly || dream.favorite

    return matchesQuery && matchesMood && matchesClarity && matchesLucid && matchesFavorite
  })
}
