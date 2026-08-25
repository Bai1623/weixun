import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'

import OnboardingPage from './OnboardingPage.vue'

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  requestPersistentStorage: vi.fn(),
}))

vi.mock('@/features/settings/stores/settings', () => ({
  useSettingsStore: () => ({ update: mocks.update }),
}))
vi.mock('@/pwa/storagePersistence', () => ({
  requestPersistentStorage: mocks.requestPersistentStorage,
}))
vi.mock('@/pwa/installPrompt', () => ({
  useInstallPrompt: () => ({
    canInstall: { value: false },
    showIosInstructions: { value: false },
    requestInstall: vi.fn(),
  }),
}))

describe('OnboardingPage', () => {
  it('explains local storage, persists acceptance and enters the dream river', async () => {
    mocks.update.mockResolvedValue(undefined)
    mocks.requestPersistentStorage.mockResolvedValue('granted')
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/onboarding', component: OnboardingPage },
        { path: '/home', component: { template: '<div>梦河</div>' } },
      ],
    })
    await router.push('/onboarding')
    await router.isReady()
    const wrapper = mount(OnboardingPage, { global: { plugins: [router] } })

    expect(wrapper.text()).toContain('文字、录音和画面保存在你的设备里')
    await wrapper.get('button[aria-label="完成首次设置"]').trigger('click')
    await flushPromises()

    expect(mocks.requestPersistentStorage).toHaveBeenCalledOnce()
    expect(mocks.update).toHaveBeenCalledWith({ onboardingCompleted: true })
    expect(router.currentRoute.value.path).toBe('/home')
  })
})
