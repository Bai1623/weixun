import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createDraftDream } from '@/features/dreams/model/dream'

import AiActionPanel from './AiActionPanel.vue'

const dream = {
  ...createDraftDream('dream-1', new Date('2026-08-25T00:00:00.000Z')),
  status: 'saved' as const,
  rawText: '原始梦境永远不能被覆盖',
}

describe('AiActionPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('keeps offline features honest when no AI endpoint is configured', () => {
    const wrapper = mount(AiActionPanel, {
      props: { dream, endpoint: null },
      global: { plugins: [createPinia()], stubs: { Teleport: true } },
    })

    expect(wrapper.text()).toContain('尚未配置 AI 服务')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('makes zero requests when the user cancels the data consent dialog', async () => {
    const wrapper = mount(AiActionPanel, {
      props: { dream, endpoint: 'https://dream.example' },
      global: { plugins: [createPinia()], stubs: { Teleport: true } },
    })

    await wrapper.get('button[aria-label="AI 整理梦境"]').trigger('click')
    expect(wrapper.text()).toContain('梦境正文与已选元数据')
    await wrapper.get('button[aria-label="取消 AI 操作"]').trigger('click')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('previews valid organization and applies it without changing raw text', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ title: '雾里的门', summary: '沿水远行', mood: 'mysterious', keywords: ['水面'] }),
    )
    const saveDream = vi.fn(async (record) => record)
    const wrapper = mount(AiActionPanel, {
      props: { dream, endpoint: 'https://dream.example', saveDream },
      global: { plugins: [createPinia()], stubs: { Teleport: true } },
    })

    await wrapper.get('button[aria-label="AI 整理梦境"]').trigger('click')
    await wrapper.get('button[aria-label="确认 AI 操作"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('沿水远行')

    await wrapper.get('button[aria-label="应用 AI 整理"]').trigger('click')
    await flushPromises()
    expect(saveDream).toHaveBeenCalledWith(
      expect.objectContaining({ rawText: dream.rawText, title: '雾里的门', summary: '沿水远行' }),
    )
  })

  it('does not mutate the dream when the server returns an invalid mood', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ title: '标题', summary: '摘要', mood: 'diagnosed', keywords: [] }),
    )
    const saveDream = vi.fn(async (record) => record)
    const wrapper = mount(AiActionPanel, {
      props: { dream, endpoint: 'https://dream.example', saveDream },
      global: { plugins: [createPinia()], stubs: { Teleport: true } },
    })

    await wrapper.get('button[aria-label="AI 整理梦境"]').trigger('click')
    await wrapper.get('button[aria-label="确认 AI 操作"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('AI 整理结果格式不正确')
    expect(saveDream).not.toHaveBeenCalled()
  })
})

function jsonResponse(value: unknown) {
  return { ok: true, json: vi.fn(async () => value) } as unknown as Response
}
