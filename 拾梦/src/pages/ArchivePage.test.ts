import { flushPromises, mount } from '@vue/test-utils'
import { RouterLinkStub } from '@vue/test-utils'
import { reactive } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import { createDraftDream, type DreamRecord } from '@/features/dreams/model/dream'

import ArchivePage from './ArchivePage.vue'

const storeHolder = vi.hoisted(() => ({
  current: undefined as unknown as { savedDreams: DreamRecord[]; load: ReturnType<typeof vi.fn> },
}))

vi.mock('@/features/dreams/stores/dreams', () => ({
  useDreamsStore: () => storeHolder.current,
}))

function savedDream(id: string, dreamedAt: string, title: string): DreamRecord {
  return {
    ...createDraftDream(id, new Date(`${dreamedAt}T00:00:00.000Z`)),
    status: 'saved',
    title,
    rawText: `${title}的原文`,
  }
}

describe('ArchivePage', () => {
  it('groups newest months first and filters the visible cards from the search field', async () => {
    storeHolder.current = reactive({
      savedDreams: [
        savedDream('august', '2026-08-25', '雾里的门'),
        savedDream('july', '2026-07-02', '旧日花园'),
      ],
      load: vi.fn(async () => undefined),
    })
    const wrapper = mount(ArchivePage, {
      global: {
        stubs: { RouterLink: RouterLinkStub, DreamCover: true },
      },
    })
    await flushPromises()

    expect(
      wrapper.findAll('[data-testid="month-group"] > header > h2').map((item) => item.text()),
    ).toEqual(['2026年8月', '2026年7月'])

    await wrapper.get('input[name="query"]').setValue('旧日')
    expect(wrapper.findAll('[data-testid="dream-card"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('旧日花园')
    expect(wrapper.text()).not.toContain('雾里的门')
  })
})
