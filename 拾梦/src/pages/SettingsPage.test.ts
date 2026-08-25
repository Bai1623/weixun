import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import SettingsPage from './SettingsPage.vue'

const mocks = vi.hoisted(() => ({
  createBackup: vi.fn(),
  inspectBackup: vi.fn(),
  restoreBackup: vi.fn(),
  settingsGet: vi.fn(),
  settingsPut: vi.fn(),
}))

vi.mock('@/core/persistence/db', () => ({ openShimengDb: vi.fn(async () => ({})) }))
vi.mock('@/features/backup/services/backupService', () => ({
  createBackup: mocks.createBackup,
  inspectBackup: mocks.inspectBackup,
  restoreBackup: mocks.restoreBackup,
}))
vi.mock('@/features/settings/data/settingsRepository', () => ({
  createSettingsRepository: () => ({ get: mocks.settingsGet, put: mocks.settingsPut }),
}))

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    mocks.settingsGet.mockResolvedValue(undefined)
    mocks.settingsPut.mockResolvedValue(undefined)
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
    expect(mocks.settingsPut).toHaveBeenCalledWith(
      expect.objectContaining({ schemaVersion: 1, lastBackupAt: expect.any(String) }),
    )
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
})
