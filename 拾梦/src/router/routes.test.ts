import { describe, expect, it } from 'vitest'

import { routes } from './index'

describe('application routes', () => {
  it('keeps every accepted mobile flow reachable from the static PWA', () => {
    expect(routes.map((route) => route.path)).toEqual([
      '/',
      '/onboarding',
      '/home',
      '/record/:id?',
      '/dream/:id',
      '/archive',
      '/settings',
      '/:pathMatch(.*)*',
    ])
  })
})
