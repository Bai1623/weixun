export type ReducedMotionOverride = 'system' | 'reduce' | 'allow'

export interface AppSettings {
  schemaVersion: 1
  onboardingCompleted: boolean
  reducedMotionOverride: ReducedMotionOverride
  aiEndpoint: string | null
  lastBackupAt: string | null
}
