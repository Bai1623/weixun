import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import WantDrinkPage from './WantDrinkPage.vue'
import * as cloudDrinkRequests from '@/services/cloudDrinkRequests'

const mountWithToken = async (token = 'share-token') => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/want/:shareToken?', component: WantDrinkPage }],
  })
  router.push(token ? `/want/${token}` : '/want')
  await router.isReady()
  return mount(WantDrinkPage, {
    global: {
      plugins: [router],
    },
  })
}

describe('WantDrinkPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('shows an invalid link state when no share token is present', async () => {
    const wrapper = await mountWithToken('')

    expect(wrapper.text()).toContain('这个点单链接无效')
  })

  it('submits one no-photo drink request through the share token', async () => {
    const submit = vi.spyOn(cloudDrinkRequests, 'submitDrinkRequest').mockResolvedValue(undefined)
    const wrapper = await mountWithToken()

    await wrapper.get('input[placeholder="你的称呼"]').setValue('小白')
    await wrapper.get('input[placeholder="例如 冰岛 / 想见你 / 自由特调"]').setValue('冰岛')
    await wrapper.get('[aria-label="基酒 1"]').setValue('伏特加')
    await wrapper.get('select[data-testid="want-beverage-select"]').setValue('葡萄味气泡水')
    await wrapper
      .get('textarea[placeholder="少甜、清爽一点、不要太烈，或补充特殊材料。"]')
      .setValue('少甜')
    await wrapper.get('[data-testid="want-drink-submit"]').trigger('click')

    expect(submit).toHaveBeenCalledWith('share-token', {
      guestName: '小白',
      cocktailName: '冰岛',
      ingredientGroups: {
        baseLiquors: ['伏特加', '', '', ''],
        flavorLiquors: [],
        beverages: ['葡萄味气泡水'],
        other: '少甜',
      },
      note: '',
    })
    expect(wrapper.text()).toContain('已提交')
  })

  it('shows validation errors returned before cloud submission', async () => {
    vi.spyOn(cloudDrinkRequests, 'submitDrinkRequest').mockRejectedValue(
      new Error('酒名最多 40 个字。'),
    )
    const wrapper = await mountWithToken()

    await wrapper.get('input[placeholder="例如 冰岛 / 想见你 / 自由特调"]').setValue('a'.repeat(41))
    await wrapper.get('[data-testid="want-drink-submit"]').trigger('click')

    expect(wrapper.text()).toContain('酒名最多 40 个字')
  })
})
