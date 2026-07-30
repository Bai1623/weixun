import { describe, expect, it } from 'vitest'

import { routes } from './index'

describe('application routes', () => {
  it('includes all approved prototype routes', () => {
    const paths = routes.map((route) => route.path)

    expect(paths).toEqual(
      expect.arrayContaining([
        '/',
        '/home',
        '/daily',
        '/daily/result',
        '/cocktails',
        '/cocktails/:slug',
        '/cocktails/:slug/make',
        '/academy',
        '/pantry',
        '/works',
        '/profile',
      ]),
    )
  })
})
