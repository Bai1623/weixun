import { onBeforeUnmount, ref } from 'vue'

import { openShimengDb, StorageWriteError } from '@/core/persistence/db'
import type { DreamRecord } from '@/features/dreams/model/dream'
import { useDreamsStore } from '@/features/dreams/stores/dreams'
import { createMediaRepository } from '@/features/media/data/mediaRepository'
import type { MediaAsset } from '@/features/media/model/media'

import { createRecorderSession, type RecorderSession, type SavedRecording } from '../services/mediaRecorder'

export type DreamRecorderState =
  | 'idle'
  | 'requesting'
  | 'recording'
  | 'paused'
  | 'saving'
  | 'ready'
  | 'error'

let mediaRepositoryPromise: ReturnType<typeof openShimengDb> | undefined

async function getMediaRepository() {
  mediaRepositoryPromise ??= openShimengDb()
  return createMediaRepository(await mediaRepositoryPromise)
}

export function useDreamRecorder() {
  const dreams = useDreamsStore()
  const state = ref<DreamRecorderState>('idle')
  const error = ref<string | null>(null)
  const previewUrl = ref<string | null>(null)
  const pendingRecording = ref<SavedRecording | null>(null)
  let session: RecorderSession | undefined

  function replacePreview(blob?: Blob) {
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = blob ? URL.createObjectURL(blob) : null
  }

  async function start() {
    error.value = null
    if (!('MediaRecorder' in window) || !navigator.mediaDevices?.getUserMedia) {
      state.value = 'error'
      error.value = '当前浏览器不支持录音，仍可继续文字记录'
      return
    }

    state.value = 'requesting'
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      session = createRecorderSession(stream)
      session.start()
      state.value = 'recording'
    } catch (cause) {
      state.value = 'error'
      error.value =
        cause instanceof DOMException && cause.name === 'NotAllowedError'
          ? '没有麦克风权限，仍可继续文字记录'
          : '麦克风暂时不可用，仍可继续文字记录'
    }
  }

  function pause() {
    session?.pause()
    state.value = 'paused'
  }

  function resume() {
    session?.resume()
    state.value = 'recording'
  }

  async function persistPending(dream: DreamRecord): Promise<DreamRecord | null> {
    if (!pendingRecording.value) return null

    state.value = 'saving'
    error.value = null
    const repository = await getMediaRepository()
    const assetId = crypto.randomUUID()
    const recording = pendingRecording.value
    const asset: MediaAsset = {
      id: assetId,
      dreamId: dream.id,
      kind: 'audio',
      mimeType: recording.mimeType,
      size: recording.blob.size,
      createdAt: new Date().toISOString(),
      blob: recording.blob,
    }

    try {
      await repository.put(asset)
      const updated = {
        ...dream,
        audioAssetIds: [...dream.audioAssetIds, assetId],
      }
      if (dream.status === 'saved') {
        await dreams.updateSaved(updated)
      } else {
        await dreams.saveDraft(updated)
      }
      pendingRecording.value = null
      state.value = 'ready'
      return updated
    } catch (cause) {
      if (await repository.get(assetId)) await repository.delete(assetId)
      state.value = 'error'
      error.value =
        cause instanceof StorageWriteError
          ? '录音尚未保存，请先释放空间或导出备份'
          : '录音尚未保存，请稍后重试'
      return null
    }
  }

  async function stopAndSave(dream: DreamRecord): Promise<DreamRecord | null> {
    if (!session) return null

    state.value = 'saving'
    try {
      const recording = await session.stop()
      session = undefined
      pendingRecording.value = recording
      replacePreview(recording.blob)
      return await persistPending(dream)
    } catch (cause) {
      session = undefined
      state.value = 'error'
      error.value = cause instanceof Error ? cause.message : '录音失败，请重新尝试'
      return null
    }
  }

  function cancel() {
    session?.cancel()
    session = undefined
    state.value = 'idle'
    error.value = null
  }

  function discardPending() {
    pendingRecording.value = null
    replacePreview()
    state.value = 'idle'
    error.value = null
  }

  onBeforeUnmount(() => {
    session?.cancel()
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  })

  return {
    state,
    error,
    previewUrl,
    pendingRecording,
    start,
    pause,
    resume,
    stopAndSave,
    retrySave: persistPending,
    cancel,
    discardPending,
  }
}
