export interface SavedRecording {
  blob: Blob
  mimeType: string
  durationMs: number
}

export interface RecorderSupport {
  isTypeSupported(type: string): boolean
}

const preferredMimeTypes = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm']

export function chooseRecorderMimeType(recorder: RecorderSupport): string | undefined {
  return preferredMimeTypes.find((type) => recorder.isTypeSupported(type))
}

export interface RecorderSession {
  start(): void
  pause(): void
  resume(): void
  stop(): Promise<SavedRecording>
  cancel(): void
}

export function createRecorderSession(
  stream: MediaStream,
  Recorder: typeof MediaRecorder = MediaRecorder,
  now: () => number = () => performance.now(),
): RecorderSession {
  const preferredType = chooseRecorderMimeType(Recorder)
  const recorder = new Recorder(stream, preferredType ? { mimeType: preferredType } : undefined)
  const chunks: Blob[] = []
  let startedAt = 0
  let pausedAt: number | undefined
  let pausedDuration = 0
  let tracksStopped = false

  function stopTracks() {
    if (tracksStopped) return
    tracksStopped = true
    stream.getTracks().forEach((track) => track.stop())
  }

  recorder.addEventListener('dataavailable', (event) => {
    const chunk = (event as BlobEvent).data
    if (chunk?.size) chunks.push(chunk)
  })

  return {
    start() {
      startedAt = now()
      recorder.start()
    },
    pause() {
      if (recorder.state !== 'recording') return
      pausedAt = now()
      recorder.pause()
    },
    resume() {
      if (recorder.state !== 'paused') return
      if (pausedAt !== undefined) pausedDuration += now() - pausedAt
      pausedAt = undefined
      recorder.resume()
    },
    stop() {
      return new Promise<SavedRecording>((resolve, reject) => {
        if (recorder.state === 'inactive') {
          stopTracks()
          reject(new Error('录音尚未开始'))
          return
        }

        const handleError = () => {
          stopTracks()
          reject(new Error('录音编码失败'))
        }
        const handleStop = () => {
          recorder.removeEventListener('error', handleError)
          stopTracks()
          if (pausedAt !== undefined) pausedDuration += now() - pausedAt
          const mimeType = recorder.mimeType || preferredType || chunks[0]?.type || 'audio/webm'
          const blob = new Blob(chunks, { type: mimeType })
          if (!blob.size) {
            reject(new Error('没有录到声音，请重新尝试'))
            return
          }
          resolve({
            blob,
            mimeType,
            durationMs: Math.max(0, Math.round(now() - startedAt - pausedDuration)),
          })
        }

        recorder.addEventListener('error', handleError, { once: true })
        recorder.addEventListener('stop', handleStop, { once: true })
        recorder.stop()
      })
    },
    cancel() {
      if (recorder.state !== 'inactive') recorder.stop()
      chunks.length = 0
      stopTracks()
    },
  }
}
