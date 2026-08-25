import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { RouterLinkStub } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createDraftDream, type DreamRecord } from '@/features/dreams/model/dream'

import HomePage from './HomePage.vue'

const storeHolder = vi.hoisted(() => ({
  current: undefined as unknown as {
    savedDreams: DreamRecord[]
    load: ReturnType<typeof vi.fn>
  },
}))

vi.mock('@/features/dreams/stores/dreams', () => ({
  useDreamsStore: () => storeHolder.current,
}))

function savedDream(id: string, dreamedAt: string, createdAt: string, title: string | null) {
  return {
    ...createDraftDream(id, new Date(createdAt)),
    status: 'saved' as const,
    dreamedAt,
    title,
    rawText: `${id} 的原始梦境`,
  }
}

async function mountHomePage() {
  const wrapper = mount(HomePage, {
    global: {
      stubs: {
        RouterLink: RouterLinkStub,
        DreamCover: true,
      },
    },
  })
  await flushPromises()
  return wrapper
}

describe('HomePage', () => {
  beforeEach(() => {
    storeHolder.current = reactive({
      savedDreams: [] as DreamRecord[],
      load: vi.fn(async () => undefined),
    })
  })

  it('shows an honest empty river without invented dream copy', async () => {
    const wrapper = await mountHomePage()

    expect(wrapper.text()).toContain('这里还没有梦的倒影')
    expect(wrapper.text()).toContain('拾起第一个梦')
    expect(wrapper.findAll('[data-testid="dream-card"]')).toHaveLength(0)
  })

  it('orders saved dreams by dreamed date and creation time with an honest title fallback', async () => {
    storeHolder.current.savedDreams = [
      savedDream('older', '2026-08-24', '2026-08-24T23:00:00.000Z', '旧日花园'),
      savedDream('newer-first', '2026-08-25', '2026-08-25T01:00:00.000Z', null),
      savedDream('newer-last', '2026-08-25', '2026-08-25T03:00:00.000Z', '雾里的门'),
    ]

    const wrapper = await mountHomePage()
    const titles = wrapper.findAll('[data-testid="dream-card"] h2').map((heading) => heading.text())

    expect(titles).toEqual(['雾里的门', '未命名的梦', '旧日花园'])
    expect(wrapper.text()).not.toContain('这里还没有梦的倒影')
  })
})
