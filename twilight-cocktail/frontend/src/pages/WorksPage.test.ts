import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import WorksPage from './WorksPage.vue'
import { useWorkStore } from '@/stores/works'
import { addCustomWorkCocktailOption } from '@/utils/workFormOptions'

describe('WorksPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    setActivePinia(createPinia())
  })

  it('does not save a work record from the form submit event', async () => {
    const wrapper = mount(WorksPage)
    const works = useWorkStore()

    await wrapper
      .get('input[placeholder="例如 想见你 / 白桃乌龙 / 自由特调"]')
      .setValue('无酒精晚杯')
    await wrapper.get('form').trigger('submit')

    expect(works.items).toHaveLength(0)
  })

  it('saves a work record without base liquor and clears the form after clicking save', async () => {
    const wrapper = mount(WorksPage)
    const works = useWorkStore()

    await wrapper
      .get('input[placeholder="例如 想见你 / 白桃乌龙 / 自由特调"]')
      .setValue('无酒精晚杯')
    await wrapper
      .get('textarea[placeholder="自由记录，例如：冰块、柠檬片、薄荷叶，或补充具体用量。"]')
      .setValue('柠檬片\n冰块')
    await wrapper.get('[data-testid="work-save-button"]').trigger('click')

    expect(works.items).toHaveLength(1)
    expect(works.items[0]).toMatchObject({
      cocktailName: '无酒精晚杯',
      ingredientsText: '柠檬片\n冰块',
    })
    expect(
      wrapper.get<HTMLInputElement>('input[placeholder="例如 想见你 / 白桃乌龙 / 自由特调"]')
        .element.value,
    ).toBe('')
    expect(
      wrapper.get<HTMLTextAreaElement>(
        'textarea[placeholder="自由记录，例如：冰块、柠檬片、薄荷叶，或补充具体用量。"]',
      ).element.value,
    ).toBe('')
  })

  it('shows a consistent error dialog when saving fails validation', async () => {
    const wrapper = mount(WorksPage)
    const works = useWorkStore()

    await wrapper.get('[data-testid="work-save-button"]').trigger('click')

    expect(works.items).toHaveLength(0)
    expect(wrapper.get('[role="dialog"]').text()).toContain('保存失败')
    expect(wrapper.get('[role="dialog"]').text()).toContain('请先填写作品名称。')
  })

  it('shows a storage error dialog and keeps the form when browser persistence fails', async () => {
    const wrapper = mount(WorksPage)
    const works = useWorkStore()
    const setItem = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    })

    try {
      await wrapper
        .get('input[placeholder="例如 想见你 / 白桃乌龙 / 自由特调"]')
        .setValue('大图作品')
      await wrapper.get('[data-testid="work-save-button"]').trigger('click')

      expect(works.items).toHaveLength(0)
      expect(wrapper.get('[role="dialog"]').text()).toContain('保存失败')
      expect(wrapper.get('[role="dialog"]').text()).toContain('浏览器本地存储空间不足')
      expect(
        wrapper.get<HTMLInputElement>('input[placeholder="例如 想见你 / 白桃乌龙 / 自由特调"]')
          .element.value,
      ).toBe('大图作品')
    } finally {
      setItem.mockRestore()
    }
  })

  it('shows a success dialog after saving and keeps edited custom cocktail records after reload', async () => {
    const custom = addCustomWorkCocktailOption({
      nameZh: '自定义海盐杯',
      ingredientsText: '饮料：葡萄味气泡水',
      ingredientGroups: {
        baseLiquors: [],
        flavorLiquors: [],
        beverages: ['葡萄味气泡水'],
        other: '海盐',
      },
    })
    const works = useWorkStore()
    const item = works.add({
      madeAt: '2026-08-02',
      cocktailSlug: custom?.value ?? '',
      cocktailName: '自定义海盐杯',
      photoDataUrl: '',
      ingredientsText: '饮料：葡萄味气泡水',
      ingredientGroups: {
        baseLiquors: [],
        flavorLiquors: [],
        beverages: ['葡萄味气泡水'],
        other: '海盐',
      },
      rating: 0,
      mood: '',
      selfReview: '',
      notes: '',
    })
    const wrapper = mount(WorksPage)

    await wrapper.get(`[aria-label="编辑 ${item.cocktailName}"]`).trigger('click')
    await wrapper
      .get('input[placeholder="例如 想见你 / 白桃乌龙 / 自由特调"]')
      .setValue('自定义海盐杯改良版')
    await wrapper
      .get('textarea[placeholder="场景、朋友反馈、杯型或装饰。"]')
      .setValue('加了新照片和备注')
    await wrapper.get('[data-testid="work-save-button"]').trigger('click')

    expect(wrapper.get('[role="dialog"]').text()).toContain('保存成功')
    expect(works.items[0]).toMatchObject({
      id: item.id,
      cocktailName: '自定义海盐杯改良版',
      notes: '加了新照片和备注',
    })

    setActivePinia(createPinia())
    const restored = useWorkStore()
    expect(restored.items[0]).toMatchObject({
      id: item.id,
      cocktailName: '自定义海盐杯改良版',
      notes: '加了新照片和备注',
    })
  })

  it('filters visible work records before sharing', async () => {
    const works = useWorkStore()
    works.add({
      madeAt: '2026-08-01',
      cocktailSlug: '',
      cocktailName: '金酒高分',
      photoDataUrl: '',
      ingredientsText: '',
      ingredientGroups: {
        baseLiquors: ['金酒'],
        flavorLiquors: [],
        beverages: [],
        other: '柠檬片',
      },
      rating: 5,
      mood: '',
      selfReview: '',
      notes: '',
    })
    works.add({
      madeAt: '2026-08-02',
      cocktailSlug: '',
      cocktailName: '伏特加高分',
      photoDataUrl: '',
      ingredientsText: '',
      ingredientGroups: {
        baseLiquors: ['伏特加'],
        flavorLiquors: [],
        beverages: [],
        other: '',
      },
      rating: 5,
      mood: '',
      selfReview: '',
      notes: '',
    })
    works.add({
      madeAt: '2026-08-03',
      cocktailSlug: '',
      cocktailName: '金酒低分',
      photoDataUrl: '',
      ingredientsText: '',
      ingredientGroups: {
        baseLiquors: ['金酒'],
        flavorLiquors: [],
        beverages: [],
        other: '',
      },
      rating: 2,
      mood: '',
      selfReview: '',
      notes: '',
    })
    const wrapper = mount(WorksPage)

    await wrapper.get('[data-testid="work-filter-base"]').setValue('金酒')
    await wrapper.get('[data-testid="work-filter-rating"]').setValue('4')

    expect(wrapper.text()).toContain('金酒高分')
    expect(wrapper.text()).not.toContain('伏特加高分')
    expect(wrapper.text()).not.toContain('金酒低分')
    expect(wrapper.text()).toContain('当前显示 1 条')
  })
})
