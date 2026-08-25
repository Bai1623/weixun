let draftDirty = false
let recorderState = 'idle'

export function setDraftDirty(value: boolean) {
  draftDirty = value
}

export function setRecorderState(value: string) {
  recorderState = value
}

export function canReloadSafely(): boolean {
  return !draftDirty && ['idle', 'ready'].includes(recorderState)
}
