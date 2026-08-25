import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createDraftDream } from '@/features/dreams/model/dream'

import PosterPreviewDialog from './PosterPreviewDialog.vue'

const mocks = vi.hoisted(() => ({ renderDreamPosters: vi.fn() }))
vi.mock('../services/posterService', () => ({ renderDreamPosters: mocks.renderDreamPosters }))

describe('PosterPreviewDialog', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mocks.renderDreamPosters.mockResolvedValue([new Blob(['one']), new Blob(['two'])])
    let index = 0
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => `blob:poster-${++index}`),
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(() => undefined),
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
  })

  it('previews every page and downloads numbered PNG files after one confirmation', async () => {
    const dream = {
      ...createDraftDream('dream-1', new Date('2026-08-25T00:00:00.000Z')),
      status: 'saved' as const,
      title: '雾里的门',
      rawText: '很长的梦',
    }
    const wrapper = mount(PosterPreviewDialog, { props: { dream, mode: 'full' } })
    await flushPromises()

    expect(wrapper.findAll('img')).toHaveLength(2)
    expect(wrapper.text()).toContain('共 2 页')

    await wrapper.get('button[aria-label="下载全部长图"]').trigger('click')
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(2)

    wrapper.unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2)
  })
})
