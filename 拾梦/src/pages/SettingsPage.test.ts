import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import SettingsPage from './SettingsPage.vue'

const mocks = vi.hoisted(() => ({
  createBackup: vi.fn(),
  inspectBackup: vi.fn(),
  restoreBackup: vi.fn(),
  settingsLoad: vi.fn(),
  settingsUpdate: vi.fn(),
  settings: {
    schemaVersion: 1 as const,
    onboardingCompleted: false,
    reducedMotionOverride: 'system' as const,
    aiEndpoint: null as string | null,
    lastBackupAt: null as string | null,
  },
}))

vi.mock('@/core/persistence/db', () => ({ openShimengDb: vi.fn(async () => ({})) }))
vi.mock('@/features/backup/services/backupService', () => ({
  createBackup: mocks.createBackup,
  inspectBackup: mocks.inspectBackup,
  restoreBackup: mocks.restoreBackup,
}))
vi.mock('@/features/settings/stores/settings', () => ({
  useSettingsStore: () => ({
    settings: mocks.settings,
    load: mocks.settingsLoad,
    update: mocks.settingsUpdate,
  }),
}))

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    mocks.settings.aiEndpoint = null
    mocks.settings.lastBackupAt = null
    mocks.settingsLoad.mockResolvedValue(mocks.settings)
    mocks.settingsUpdate.mockImplementation(async (patch) => {
      Object.assign(mocks.settings, patch)
      return mocks.settings
    })
    mocks.createBackup.mockResolvedValue(new Blob(['zip']))
    mocks.restoreBackup.mockResolvedValue({ imported: 1, skipped: 0, conflictCopies: 0 })
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:backup'),
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(() => undefined),
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
  })

  it('warns that backups are unencrypted before exporting and records the backup time', async () => {
    const wrapper = mount(SettingsPage)
    await flushPromises()

    await wrapper.get('button[aria-label="导出完整备份"]').trigger('click')
    expect(wrapper.text()).toContain('备份未加密，请妥善保管')
    expect(mocks.createBackup).not.toHaveBeenCalled()

    await wrapper.get('button[aria-label="确认导出备份"]').trigger('click')
    await flushPromises()
    expect(mocks.createBackup).toHaveBeenCalledOnce()
    expect(mocks.settingsUpdate).toHaveBeenCalledWith({ lastBackupAt: expect.any(String) })
  })

  it('inspects an import before enabling the irreversible write step', async () => {
    const inspection = {
      manifest: { schemaVersion: 1, exportedAt: '2026-08-25T00:00:00.000Z', dreamCount: 1, mediaCount: 0, media: [] },
      dreams: [],
      media: [],
      warnings: [],
      counts: { dreams: 1, media: 0 },
    }
    mocks.inspectBackup.mockResolvedValue(inspection)
    const wrapper = mount(SettingsPage)
    await flushPromises()
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [new File(['zip'], 'dream.zip')] })

    await input.trigger('change')
    await flushPromises()
    expect(wrapper.text()).toContain('将恢复 1 个梦和 0 个媒体文件')
    expect(mocks.restoreBackup).not.toHaveBeenCalled()

    await wrapper.get('button[aria-label="确认恢复"]').trigger('click')
    await flushPromises()
    expect(mocks.restoreBackup).toHaveBeenCalledWith(expect.anything(), inspection)
  })

  it('rejects insecure remote AI endpoints and saves normalized HTTPS endpoints', async () => {
    const wrapper = mount(SettingsPage)
    await flushPromises()
    const input = wrapper.get('input[aria-describedby="ai-endpoint-help"]')

    await input.setValue('http://dream.example')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.text()).toContain('AI 服务地址必须使用 HTTPS')
    expect(mocks.settingsUpdate).not.toHaveBeenCalled()

    await input.setValue('https://dream.example/')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.settingsUpdate).toHaveBeenCalledWith({ aiEndpoint: 'https://dream.example' })
    expect(wrapper.text()).toContain('AI 服务地址已保存')
  })
})
