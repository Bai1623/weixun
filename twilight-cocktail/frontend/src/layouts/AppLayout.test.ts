import { mount, RouterLinkStub } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it } from 'vitest'

import AppLayout from './AppLayout.vue'

/* eslint-disable vue/one-component-per-file */

const RoutePage = defineComponent({
  name: 'RoutePageStub',
  setup() {
    return () => h('section', { 'data-testid': 'route-page' }, 'page')
  },
})

describe('AppLayout', () => {
  it('wraps pages in the visual shell and transition frame', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/home', component: RoutePage }],
    })
    await router.push('/home')
    await router.isReady()
    const wrapper = mount(AppLayout, {
      global: {
        plugins: [router],
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

    expect(wrapper.find('.app-shell').exists()).toBe(true)
    expect(wrapper.find('.app-main').exists()).toBe(true)
    expect(wrapper.find('.page-transition-frame').exists()).toBe(true)
    expect(wrapper.find('[data-testid="route-page"]').exists()).toBe(true)
  })
})
