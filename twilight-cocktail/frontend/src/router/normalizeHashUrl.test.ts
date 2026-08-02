import { afterEach, describe, expect, it, vi } from 'vitest'

import { getNormalizedHashUrl, resetInitialScrollPosition } from './normalizeHashUrl'

describe('getNormalizedHashUrl', () => {
  it('moves cache query params after the hash route for GitHub Pages links', () => {
    expect(
      getNormalizedHashUrl({
        pathname: '/weixun/',
        search: '?v=storage-fix-local',
        hash: '#/works',
      }),
    ).toBe('/weixun/#/works?v=storage-fix-local')
  })

  it('keeps existing hash query params and appends the pre-hash query', () => {
    expect(
      getNormalizedHashUrl({
        pathname: '/weixun/',
        search: '?v=1',
        hash: '#/works?tab=mine',
      }),
    ).toBe('/weixun/#/works?tab=mine&v=1')
  })

  it('does not rewrite ordinary hash route URLs', () => {
    expect(
      getNormalizedHashUrl({
        pathname: '/weixun/',
        search: '',
        hash: '#/works',
      }),
    ).toBe('')
  })
})

describe('resetInitialScrollPosition', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    delete (window.history as Partial<History>).scrollRestoration
  })

  it('disables browser scroll restoration and returns the app to the top', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    Object.defineProperty(window.history, 'scrollRestoration', {
      configurable: true,
      value: 'auto',
      writable: true,
    })

    resetInitialScrollPosition()

    expect(window.history.scrollRestoration).toBe('manual')
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
  })
})
