import type { ReducedMotionOverride } from '@/features/settings/model/settings'

export function applyMotionPreference(preference: ReducedMotionOverride) {
  if (typeof document === 'undefined') return
  if (preference === 'system') delete document.documentElement.dataset.motion
  else document.documentElement.dataset.motion = preference
}
