import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import WorksPage from './WorksPage.vue'
import { useWorkStore } from '@/stores/works'

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
})
