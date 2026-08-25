import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { reactive } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import { createDraftDream, type DreamRecord } from '@/features/dreams/model/dream'

import DreamDetailPage from './DreamDetailPage.vue'

const storeHolder = vi.hoisted(() => ({ current: undefined as unknown }))

vi.mock('@/features/dreams/stores/dreams', () => ({
  useDreamsStore: () => storeHolder.current,
}))
vi.mock('@/features/settings/stores/settings', () => ({
  useSettingsStore: () => ({ settings: { aiEndpoint: null }, load: vi.fn(async () => undefined) }),
}))

async function mountDetail(dream: DreamRecord) {
  const store = reactive({
    savedDreams: [dream],
    pendingDeletions: {} as Record<string, DreamRecord>,
    load: vi.fn(async () => undefined),
    toggleFavorite: vi.fn(async (id: string) => {
      const found = store.savedDreams.find((record) => record.id === id)
      if (found) found.favorite = !found.favorite
    }),
    updateSaved: vi.fn(async (record: DreamRecord) => record),
    scheduleDelete: vi.fn((id: string) => {
      const found = store.savedDreams.find((record) => record.id === id)
      if (found) store.pendingDeletions[id] = found
      store.savedDreams = store.savedDreams.filter((record) => record.id !== id)
    }),
    undoDelete: vi.fn((id: string) => {
      const found = store.pendingDeletions[id]
      if (found) store.savedDreams = [found, ...store.savedDreams]
      delete store.pendingDeletions[id]
    }),
  })
  storeHolder.current = store
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/dream/:id', component: DreamDetailPage },
      { path: '/record/:id?', component: { template: '<div>编辑</div>' } },
      { path: '/home', component: { template: '<div>首页</div>' } },
    ],
  })
  await router.push(`/dream/${dream.id}`)
  await router.isReady()
  const wrapper = mount(DreamDetailPage, {
    global: {
      plugins: [router],
      stubs: { AiActionPanel: true, DreamCover: true, LocalAudioPlayer: true },
    },
  })
  await flushPromises()
  return { wrapper, store }
}

describe('DreamDetailPage', () => {
  it('renders original and organized text with favorite, edit and reversible delete actions', async () => {
    const dream = {
      ...createDraftDream('dream-1', new Date('2026-08-25T00:00:00.000Z')),
      status: 'saved' as const,
      title: '雾里的门',
      rawText: '这是不可覆盖的原始梦境。',
      summary: '一场沿着水面发生的远行。',
      tags: ['水面', '月亮'],
    }
    const { wrapper, store } = await mountDetail(dream)

    expect(wrapper.text()).toContain('这是不可覆盖的原始梦境。')
    expect(wrapper.text()).toContain('一场沿着水面发生的远行。')
    expect(wrapper.get('a[aria-label="编辑梦境"]').attributes('href')).toContain(`/record/${dream.id}`)

    await wrapper.get('button[aria-label="收藏梦境"]').trigger('click')
    expect(store.toggleFavorite).toHaveBeenCalledWith(dream.id)

    await wrapper.get('button[aria-label="删除梦境"]').trigger('click')
    expect(store.scheduleDelete).toHaveBeenCalledWith(dream.id, 8_000)
    expect(wrapper.text()).toContain('梦境已移入雾中')

    await wrapper.get('button[aria-label="撤销删除"]').trigger('click')
    expect(store.undoDelete).toHaveBeenCalledWith(dream.id)
  })
})
