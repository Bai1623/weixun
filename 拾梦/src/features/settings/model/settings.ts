export type ReducedMotionOverride = 'system' | 'reduce' | 'allow'

export interface AppSettings {
  schemaVersion: 1
  onboardingCompleted: boolean
  reducedMotionOverride: ReducedMotionOverride
  aiEndpoint: string | null
  lastBackupAt: string | null
}

export const defaultAppSettings: AppSettings = {
  schemaVersion: 1,
  onboardingCompleted: false,
  reducedMotionOverride: 'system',
  aiEndpoint: null,
  lastBackupAt: null,
}
