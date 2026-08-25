import { describe, expect, it, vi } from 'vitest'

import { useInstallPrompt } from './installPrompt'

describe('useInstallPrompt', () => {
  it('captures the Android install event but prompts only after an explicit click', async () => {
    const prompt = vi.fn(async () => undefined)
    const event = new Event('beforeinstallprompt')
    Object.assign(event, {
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
    })
    const install = useInstallPrompt(window, 'Mozilla/5.0 (Linux; Android 15)')

    window.dispatchEvent(event)
    expect(install.canInstall.value).toBe(true)
    expect(prompt).not.toHaveBeenCalled()

    await install.requestInstall()
    expect(prompt).toHaveBeenCalledOnce()
    install.dispose()
  })

  it('shows manual Add to Home Screen guidance on iOS when no install event exists', () => {
    const install = useInstallPrompt(window, 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')

    expect(install.showIosInstructions.value).toBe(true)
    install.dispose()
  })
})
