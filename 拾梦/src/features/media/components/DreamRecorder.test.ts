import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { defineComponent, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createDraftDream } from '@/features/dreams/model/dream'

import DreamRecorder from './DreamRecorder.vue'

const Host = defineComponent({
  components: { DreamRecorder },
  setup() {
    const dream = ref({
      ...createDraftDream('dream-1', new Date('2026-08-25T00:00:00.000Z')),
      rawText: '文字仍然在这里',
    })
    return { dream }
  },
  template: `
    <main>
      <textarea name="rawText" v-model="dream.rawText" />
      <DreamRecorder v-model:dream="dream" />
    </main>
  `,
})

describe('DreamRecorder', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps text editing available when microphone permission is denied', async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError'))
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } })
    vi.stubGlobal('MediaRecorder', class MediaRecorderStub {})
    const wrapper = mount(Host, { global: { plugins: [createPinia()] } })

    await wrapper.get('button[aria-label="开始录音"]').trigger('click')
    await flushPromises()

    const textarea = wrapper.get('textarea[name="rawText"]')
    expect((textarea.element as HTMLTextAreaElement).value).toBe('文字仍然在这里')
    expect(textarea.attributes('disabled')).toBeUndefined()
    expect(wrapper.text()).toContain('没有麦克风权限，仍可继续文字记录')
  })
})
