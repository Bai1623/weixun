import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('virtual:pwa-register', () => ({
  registerSW: vi.fn(() => vi.fn()),
}))

import { clearLegacyPwaCaches } from './registerServiceWorker'

describe('register service worker', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('unregisters existing service workers and clears old PWA caches', async () => {
    const unregisterFirst = vi.fn().mockResolvedValue(true)
    const unregisterSecond = vi.fn().mockResolvedValue(true)
    const getRegistrations = vi
      .fn()
      .mockResolvedValue([{ unregister: unregisterFirst }, { unregister: unregisterSecond }])
    const keys = vi.fn().mockResolvedValue(['workbox-precache-v1', 'runtime-cache'])
    const deleteCache = vi.fn().mockResolvedValue(true)

    Object.defineProperty(window.navigator, 'serviceWorker', {
      configurable: true,
      value: { getRegistrations },
    })
    vi.stubGlobal('caches', {
      keys,
      delete: deleteCache,
    })

    await clearLegacyPwaCaches()

    expect(getRegistrations).toHaveBeenCalledTimes(1)
    expect(unregisterFirst).toHaveBeenCalledTimes(1)
    expect(unregisterSecond).toHaveBeenCalledTimes(1)
    expect(keys).toHaveBeenCalledTimes(1)
    expect(deleteCache).toHaveBeenCalledWith('workbox-precache-v1')
    expect(deleteCache).toHaveBeenCalledWith('runtime-cache')
  })
})
