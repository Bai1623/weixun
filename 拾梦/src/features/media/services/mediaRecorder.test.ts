import { describe, expect, it, vi } from 'vitest'

import { chooseRecorderMimeType, createRecorderSession } from './mediaRecorder'

describe('chooseRecorderMimeType', () => {
  it('chooses the first supported format in the cross-mobile preference order', () => {
    const Recorder = {
      isTypeSupported: vi.fn((type: string) => type === 'audio/mp4' || type === 'audio/webm'),
    }

    expect(chooseRecorderMimeType(Recorder)).toBe('audio/mp4')
    expect(Recorder.isTypeSupported.mock.calls.map(([type]) => type)).toEqual([
      'audio/webm;codecs=opus',
      'audio/mp4',
    ])
  })

  it('lets the browser choose when none of the preferred formats is supported', () => {
    expect(chooseRecorderMimeType({ isTypeSupported: () => false })).toBeUndefined()
  })
})

describe('createRecorderSession', () => {
  it('collects non-empty chunks and always stops the microphone tracks', async () => {
    const stopTrack = vi.fn()
    const stream = {
      getTracks: () => [{ stop: stopTrack }],
    } as unknown as MediaStream

    class FakeRecorder extends EventTarget {
      static isTypeSupported() {
        return true
      }

      state: RecordingState = 'inactive'
      mimeType = 'audio/webm;codecs=opus'

      constructor() {
        super()
      }

      start() {
        this.state = 'recording'
      }

      pause() {
        this.state = 'paused'
      }

      resume() {
        this.state = 'recording'
      }

      stop() {
        const dataEvent = new Event('dataavailable') as BlobEvent
        Object.defineProperty(dataEvent, 'data', { value: new Blob(['abc'], { type: this.mimeType }) })
        this.dispatchEvent(dataEvent)
        this.state = 'inactive'
        this.dispatchEvent(new Event('stop'))
      }
    }

    let now = 100
    const session = createRecorderSession(
      stream,
      FakeRecorder as unknown as typeof MediaRecorder,
      () => now,
    )
    session.start()
    now = 850
    const recording = await session.stop()

    expect(recording.blob.size).toBe(3)
    expect(recording.mimeType).toBe('audio/webm;codecs=opus')
    expect(recording.durationMs).toBe(750)
    expect(stopTrack).toHaveBeenCalledOnce()
  })
})
