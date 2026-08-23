import { mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import ProfilePage from './ProfilePage.vue'

describe('ProfilePage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    setActivePinia(createPinia())
  })

  it('links account and backup management from My', () => {
    const wrapper = mount(ProfilePage, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    })

    const entry = wrapper.get('[data-testid="account-data-entry"]')
    expect(entry.text()).toContain('账号与数据')
    expect(entry.text()).toContain('检查备份、备份到云端、从云端恢复')
    expect(
      wrapper
        .findAllComponents(RouterLinkStub)
        .some((link) => link.props('to') === '/profile/data'),
    ).toBe(true)
    expect(wrapper.text()).not.toContain('清除本地数据')
  })
})
