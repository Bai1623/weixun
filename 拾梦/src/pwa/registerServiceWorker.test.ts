import { describe, expect, it, vi } from 'vitest'

import { registerServiceWorker } from './registerServiceWorker'
import { canReloadSafely, setDraftDirty, setRecorderState } from './reloadSafety'

describe('registerServiceWorker', () => {
  it('exposes an update but never reloads while local work is unsafe', async () => {
    let registrationOptions: { onNeedRefresh?: () => void } | undefined
    const updater = vi.fn(async () => undefined)
    const register = vi.fn((options) => {
      registrationOptions = options
      return updater
    })
    let safe = false
    const controller = registerServiceWorker(() => safe, register, true)

    registrationOptions?.onNeedRefresh?.()
    expect(controller.needRefresh.value).toBe(true)
    await expect(controller.acceptUpdate()).resolves.toBe(false)
    expect(updater).not.toHaveBeenCalled()

    safe = true
    await expect(controller.acceptUpdate()).resolves.toBe(true)
    expect(updater).toHaveBeenCalledWith(true)
  })

  it('blocks reload for dirty drafts and every active recorder state', () => {
    setDraftDirty(false)
    setRecorderState('idle')
    expect(canReloadSafely()).toBe(true)

    setDraftDirty(true)
    expect(canReloadSafely()).toBe(false)
    setDraftDirty(false)
    setRecorderState('recording')
    expect(canReloadSafely()).toBe(false)
    setRecorderState('ready')
    expect(canReloadSafely()).toBe(true)
  })
})
