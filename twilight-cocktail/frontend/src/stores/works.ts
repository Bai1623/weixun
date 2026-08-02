import { defineStore } from 'pinia'

const storageKey = 'cocktail_work_records'

export type WorkRecordInput = {
  madeAt: string
  cocktailSlug: string
  cocktailName: string
  photoDataUrl: string
  ingredientsText: string
  ingredientGroups?: WorkIngredientGroups
  rating: number
  mood: string
  selfReview: string
  notes: string
}

export type WorkRecord = WorkRecordInput & {
  id: string
  createdAt: string
}

export type WorkIngredientGroups = {
  baseLiquors: string[]
  flavorLiquors: string[]
  beverages: string[]
  other: string
}

export type WorkImportResult = {
  importedCount: number
  skippedCount: number
}

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `work-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')

const toIngredientGroups = (value: unknown): WorkIngredientGroups | undefined => {
  if (!value || typeof value !== 'object') return undefined
  const candidate = value as Partial<WorkIngredientGroups>
  if (
    !isStringArray(candidate.baseLiquors) ||
    !isStringArray(candidate.flavorLiquors) ||
    !isStringArray(candidate.beverages) ||
    typeof candidate.other !== 'string'
  ) {
    return undefined
  }

  return {
    baseLiquors: candidate.baseLiquors,
    flavorLiquors: candidate.flavorLiquors,
    beverages: candidate.beverages,
    other: candidate.other,
  }
}

const toWorkRecord = (item: unknown): WorkRecord | undefined => {
  if (!item || typeof item !== 'object') return undefined
  const candidate = item as Partial<WorkRecord>
  const { id, madeAt, cocktailName, ingredientsText, createdAt } = candidate
  if (
    typeof id !== 'string' ||
    typeof madeAt !== 'string' ||
    typeof cocktailName !== 'string' ||
    typeof ingredientsText !== 'string' ||
    typeof createdAt !== 'string' ||
    (candidate.ingredientGroups !== undefined &&
      toIngredientGroups(candidate.ingredientGroups) === undefined)
  ) {
    return undefined
  }

  return {
    id,
    madeAt,
    cocktailSlug: typeof candidate.cocktailSlug === 'string' ? candidate.cocktailSlug : '',
    cocktailName,
    photoDataUrl: typeof candidate.photoDataUrl === 'string' ? candidate.photoDataUrl : '',
    ingredientsText,
    ingredientGroups: toIngredientGroups(candidate.ingredientGroups),
    rating: typeof candidate.rating === 'number' ? candidate.rating : 0,
    mood: typeof candidate.mood === 'string' ? candidate.mood : '',
    selfReview: typeof candidate.selfReview === 'string' ? candidate.selfReview : '',
    notes: typeof candidate.notes === 'string' ? candidate.notes : '',
    createdAt,
  }
}

const normalizeRecord = (record: WorkRecord): WorkRecord => ({
  ...record,
  cocktailName: record.cocktailName.trim(),
  ingredientsText: record.ingredientsText.trim() || formatWorkIngredients(record),
  ingredientGroups: normalizeIngredientGroups(record.ingredientGroups),
  mood: record.mood.trim(),
  selfReview: record.selfReview.trim(),
  notes: record.notes.trim(),
})

const readRecords = (): WorkRecord[] => {
  const value = window.localStorage.getItem(storageKey)
  if (!value) return []

  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((item) => {
      const record = toWorkRecord(item)
      return record ? [normalizeRecord(record)] : []
    })
  } catch {
    return []
  }
}

const normalizeIngredientGroups = (
  groups: WorkIngredientGroups | undefined,
): WorkIngredientGroups | undefined => {
  if (!groups) return undefined
  return {
    baseLiquors: groups.baseLiquors
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 4),
    flavorLiquors: Array.from(
      new Set(groups.flavorLiquors.map((item) => item.trim()).filter(Boolean)),
    ),
    beverages: Array.from(new Set(groups.beverages.map((item) => item.trim()).filter(Boolean))),
    other: groups.other.trim(),
  }
}

const formatLine = (label: string, values: readonly string[]) =>
  values.length ? `${label}：${values.join('、')}` : ''

export const formatWorkIngredients = (
  record: Pick<WorkRecordInput, 'ingredientsText' | 'ingredientGroups'>,
) => {
  const groups = normalizeIngredientGroups(record.ingredientGroups)
  if (!groups) return record.ingredientsText.trim()

  return [
    formatLine('基酒', groups.baseLiquors),
    formatLine('调味酒', groups.flavorLiquors),
    formatLine('饮料', groups.beverages),
    groups.other,
  ]
    .filter(Boolean)
    .join('\n')
}

export const exportWorkRecords = (records: readonly WorkRecord[]) =>
  JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      app: 'twilight-mixbook',
      type: 'work-records',
      records,
    },
    null,
    2,
  )

export const importWorkRecords = (
  json: string,
): { records: WorkRecord[]; skippedCount: number } => {
  try {
    const parsed: unknown = JSON.parse(json)
    const payloadRecords = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object'
        ? (parsed as { records?: unknown }).records
        : undefined
    if (!Array.isArray(payloadRecords)) return { records: [], skippedCount: 0 }

    const records = payloadRecords.flatMap((item) => {
      const record = toWorkRecord(item)
      return record ? [normalizeRecord(record)] : []
    })
    return {
      records,
      skippedCount: payloadRecords.length - records.length,
    }
  } catch {
    return { records: [], skippedCount: 0 }
  }
}

const writeRecords = (records: WorkRecord[]) => {
  window.localStorage.setItem(storageKey, JSON.stringify(records))
}

export const useWorkStore = defineStore('works', {
  state: () => ({
    items: readRecords(),
  }),
  getters: {
    totalCount: (state) => state.items.length,
    latestItems: (state) =>
      [...state.items].sort((a, b) =>
        `${b.madeAt}-${b.createdAt}`.localeCompare(`${a.madeAt}-${a.createdAt}`),
      ),
    averageRating: (state) => {
      const ratedItems = state.items.filter((item) => item.rating > 0)
      if (!ratedItems.length) return 0
      const total = ratedItems.reduce((sum, item) => sum + item.rating, 0)
      return Math.round((total / ratedItems.length) * 10) / 10
    },
  },
  actions: {
    add(input: WorkRecordInput): WorkRecord {
      const record: WorkRecord = {
        ...input,
        ingredientsText: input.ingredientsText.trim() || formatWorkIngredients(input),
        ingredientGroups: normalizeIngredientGroups(input.ingredientGroups),
        id: createId(),
        createdAt: new Date().toISOString(),
      }
      this.items = [record, ...this.items]
      writeRecords(this.items)
      return record
    },
    remove(id: string) {
      this.items = this.items.filter((item) => item.id !== id)
      writeRecords(this.items)
    },
    update(id: string, input: WorkRecordInput): WorkRecord | undefined {
      const existing = this.items.find((item) => item.id === id)
      if (!existing) return undefined

      const record: WorkRecord = {
        ...existing,
        ...input,
        ingredientsText: input.ingredientsText.trim() || formatWorkIngredients(input),
        ingredientGroups: normalizeIngredientGroups(input.ingredientGroups),
      }
      this.items = this.items.map((item) => (item.id === id ? record : item))
      writeRecords(this.items)
      return record
    },
    importFromJson(json: string): WorkImportResult {
      const imported = importWorkRecords(json)
      const existingIds = new Set(this.items.map((item) => item.id))
      const nextRecords = imported.records.filter((item) => !existingIds.has(item.id))
      this.items = [...nextRecords, ...this.items]
      writeRecords(this.items)
      return {
        importedCount: nextRecords.length,
        skippedCount: imported.skippedCount + imported.records.length - nextRecords.length,
      }
    },
  },
})
