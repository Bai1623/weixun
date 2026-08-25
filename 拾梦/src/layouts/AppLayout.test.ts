import { mount, RouterLinkStub } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'

import AppLayout from './AppLayout.vue'

const RoutePage = defineComponent({
  name: 'RoutePageStub',
  setup() {
    return () => h('section', 'page')
  },
})

describe('AppLayout', () => {
  it('gives every page the 拾梦 brand, main landmark and four primary destinations', () => {
    const wrapper = mount(AppLayout, {
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
          RouterView: defineComponent({
            name: 'RouterViewStub',
            setup(_props, { slots }) {
              return () => slots.default?.({ Component: RoutePage, route: { fullPath: '/home' } })
            },
          }),
        },
      },
    })

    expect(wrapper.get('[data-testid="brand"]').text()).toContain('拾梦')
    expect(wrapper.find('main').exists()).toBe(true)

    const labels = wrapper.findAll('[data-testid="primary-nav"] a').map((link) => link.text())
    expect(labels).toEqual(['梦河', '记录', '档案', '设置'])
  })
})
