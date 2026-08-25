import type {
  GenerateDreamImageInput,
  OrganizeDreamInput,
  OrganizeDreamResult,
} from '../model/ai'

export interface DreamAiGateway {
  organizeDream(input: OrganizeDreamInput, signal: AbortSignal): Promise<OrganizeDreamResult>
  transcribeAudio(audio: Blob, signal: AbortSignal): Promise<{ transcript: string }>
  generateDreamImage(input: GenerateDreamImageInput, signal: AbortSignal): Promise<Blob>
}
