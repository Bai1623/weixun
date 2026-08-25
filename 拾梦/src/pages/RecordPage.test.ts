import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { reactive } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { StorageWriteError } from '@/core/persistence/db'
import { createDraftDream, type DreamRecord } from '@/features/dreams/model/dream'

import RecordPage from './RecordPage.vue'

const storeHolder = vi.hoisted(() => ({
  current: undefined as unknown as ReturnType<typeof createStore>,
}))

vi.mock('@/features/dreams/stores/dreams', () => ({
  useDreamsStore: () => storeHolder.current,
}))

function createStore(draft: DreamRecord) {
  return reactive({
    activeDraft: draft as DreamRecord | null,
    savedDreams: [] as DreamRecord[],
    storageError: null as string | null,
    load: vi.fn(async () => undefined),
    openDraft: vi.fn(async () => draft),
    saveDraft: vi.fn(async (record: DreamRecord) => record),
    publish: vi.fn(async (record: DreamRecord) => ({ ...record, status: 'saved' as const })),
  })
}

async function mountRecordPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/record/:id?', component: RecordPage },
      { path: '/dream/:id', component: { template: '<div>梦境详情</div>' } },
    ],
  })
  await router.push('/record')
  await router.isReady()
  const wrapper = mount(RecordPage, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('RecordPage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    storeHolder.current = createStore(
      createDraftDream('draft-1', new Date('2026-08-25T01:00:00.000Z')),
    )
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('autosaves changed fields after 400ms and publishes without requiring a title', async () => {
    const wrapper = await mountRecordPage()
    const textarea = wrapper.get('textarea[name="rawText"]')

    expect(storeHolder.current.openDraft).toHaveBeenCalledWith(undefined)
    expect(wrapper.find('[name="dreamedAt"]').exists()).toBe(true)
    expect(wrapper.find('[name="mood"]').exists()).toBe(true)
    expect(wrapper.find('[name="clarity"]').exists()).toBe(true)
    expect(wrapper.find('[name="lucid"]').exists()).toBe(true)
    expect(wrapper.find('[name="tags"]').exists()).toBe(true)
    expect(wrapper.find('[name="favorite"]').exists()).toBe(true)

    await textarea.setValue('我沿着水面走向一扇门')
    await vi.advanceTimersByTimeAsync(399)
    expect(storeHolder.current.saveDraft).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    await flushPromises()
    expect(storeHolder.current.saveDraft).toHaveBeenCalledTimes(1)

    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(storeHolder.current.publish).toHaveBeenCalledWith(
      expect.objectContaining({ rawText: '我沿着水面走向一扇门', title: null }),
    )
  })

  it('keeps typed content visible and shows a persistent warning after autosave fails', async () => {
    const failure = new StorageWriteError(new DOMException('full', 'QuotaExceededError'))
    storeHolder.current.saveDraft.mockRejectedValue(failure)
    const wrapper = await mountRecordPage()
    const textarea = wrapper.get('textarea[name="rawText"]')

    await textarea.setValue('这段文字不能丢失')
    await vi.advanceTimersByTimeAsync(400)
    await flushPromises()

    expect((textarea.element as HTMLTextAreaElement).value).toBe('这段文字不能丢失')
    expect(wrapper.text()).toContain('保存失败，内容仍保留在当前页面')
  })
})
