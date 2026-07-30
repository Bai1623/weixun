import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useWorkStore } from './works'

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
})
