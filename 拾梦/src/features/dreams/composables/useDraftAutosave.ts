import { getCurrentScope, onScopeDispose, ref, watch, type Ref } from 'vue'

import type { DreamRecord } from '../model/dream'

export function useDraftAutosave(
  record: Ref<DreamRecord | null>,
  save: (record: DreamRecord) => Promise<unknown>,
  delay = 400,
) {
  const isSaving = ref(false)
  const error = ref<string | null>(null)
  let timer: ReturnType<typeof setTimeout> | undefined
  let pending = false

  async function persist() {
    if (!pending || !record.value) return

    pending = false
    isSaving.value = true
    try {
      await save(record.value)
      error.value = null
    } catch {
      error.value = '保存失败，内容仍保留在当前页面'
    } finally {
      isSaving.value = false
    }
  }

  const stop = watch(
    record,
    (current, previous) => {
      if (!current || !previous) return

      pending = true
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = undefined
        void persist()
      }, delay)
    },
    { deep: true, flush: 'sync' },
  )

  async function flush() {
    if (timer) {
      clearTimeout(timer)
      timer = undefined
    }
    await persist()
  }

  function dispose() {
    if (timer) clearTimeout(timer)
    timer = undefined
    pending = false
    stop()
  }

  if (getCurrentScope()) onScopeDispose(dispose)

  return { isSaving, error, flush, dispose }
}
