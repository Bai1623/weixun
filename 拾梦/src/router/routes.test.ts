import { describe, expect, it } from 'vitest'

import { resolveOnboardingNavigation, routes } from './index'

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

  it('redirects the first launch to onboarding and keeps completed users at home', () => {
    expect(resolveOnboardingNavigation('home', false)).toEqual({ name: 'onboarding' })
    expect(resolveOnboardingNavigation('onboarding', false)).toBeUndefined()
    expect(resolveOnboardingNavigation('home', true)).toBeUndefined()
    expect(resolveOnboardingNavigation('onboarding', true)).toEqual({ name: 'home' })
  })
})
