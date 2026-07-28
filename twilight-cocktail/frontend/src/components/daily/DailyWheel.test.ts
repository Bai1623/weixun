import { mount, RouterLinkStub } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import DailyWheel from './DailyWheel.vue'
import type { Cocktail } from '@/types/cocktail'

const makeCocktail = (slug: string, nameZh: string): Cocktail => ({
  id: slug,
  slug,
  nameZh,
  nameEn: slug.toUpperCase(),
  shortDescription: `${nameZh} short description`,
  story: '',
  imageUrl: '',
  imageTone: 'gold',
  baseSpirit: 'gin',
  glassType: 'coupe',
  method: 'shake',
  difficulty: 'easy',
  prepMinutes: 5,
  alcoholLevel: 'medium',
  flavors: { sweet: 2, sour: 3, bitter: 1, strong: 2, fresh: 4 },
  tags: [],
  popularityWeight: 1,
  beginnerFriendly: true,
  isIba: true,
  isAlcoholic: true,
  sourceName: 'fixture',
  ingredients: [],
  steps: [],
})

const candidates = [
  makeCocktail('mojito', '莫吉托'),
  makeCocktail('daiquiri', '代基里'),
  makeCocktail('negroni', '内格罗尼'),
]

describe('DailyWheel', () => {
  it('renders a light constellation picker instead of the old wheel disc', () => {
    const wrapper = mount(DailyWheel, {
      props: { candidates, spinning: false },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })

    expect(wrapper.find('.wheel-disc').exists()).toBe(false)
    expect(wrapper.find('.constellation-stage').exists()).toBe(true)
    expect(wrapper.text()).toContain('莫吉托')
    expect(wrapper.text()).toContain('开始闪选')
  })

  it('reveals the selected cocktail with a route into the daily result page', () => {
    const wrapper = mount(DailyWheel, {
      props: { candidates, spinning: false, selected: candidates[1] },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })

    expect(wrapper.find('.daily-gift').exists()).toBe(true)
    expect(wrapper.text()).toContain('代基里')
    expect(wrapper.findComponent(RouterLinkStub).props('to')).toBe('/daily/result')
  })

  it('renders every candidate as a selectable keyword', () => {
    const fullCatalog = Array.from({ length: 30 }, (_item, index) =>
      makeCocktail(`cocktail-${index}`, `酒款${index}`),
    )
    const wrapper = mount(DailyWheel, {
      props: { candidates: fullCatalog, spinning: false },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })

    expect(wrapper.findAll('.keyword-star')).toHaveLength(fullCatalog.length)
  })
})
