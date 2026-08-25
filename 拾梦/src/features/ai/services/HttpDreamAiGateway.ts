import type {
  GenerateDreamImageInput,
  OrganizeDreamInput,
  OrganizeDreamResult,
} from '../model/ai'
import type { DreamAiGateway } from './DreamAiGateway'

const dreamMoods = new Set([
  'calm',
  'joyful',
  'mysterious',
  'sad',
  'anxious',
  'fearful',
  'surreal',
  'neutral',
])

export function validateAiEndpoint(value: string): string {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error('AI 服务地址格式不正确')
  }
  const localHttp =
    url.protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
  if (url.protocol !== 'https:' && !localHttp) throw new Error('AI 服务地址必须使用 HTTPS')
  return url.toString().replace(/\/$/, '')
}

export class HttpDreamAiGateway implements DreamAiGateway {
  private readonly endpoint: string

  constructor(
    endpoint: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {
    this.endpoint = validateAiEndpoint(endpoint)
  }

  async organizeDream(input: OrganizeDreamInput, signal: AbortSignal): Promise<OrganizeDreamResult> {
    const response = await this.request(
      '/organize',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      },
      45_000,
      signal,
    )
    const value: unknown = await response.json()
    if (!isOrganizeResult(value)) throw new Error('AI 整理结果格式不正确')
    return value
  }

  async transcribeAudio(audio: Blob, signal: AbortSignal): Promise<{ transcript: string }> {
    const body = new FormData()
    body.append('audio', audio, 'dream-audio')
    const response = await this.request('/transcribe', { method: 'POST', body }, 120_000, signal)
    const value: unknown = await response.json()
    if (
      typeof value !== 'object' ||
      value === null ||
      !('transcript' in value) ||
      typeof value.transcript !== 'string' ||
      !value.transcript.trim() ||
      value.transcript.length > 20_000
    ) {
      throw new Error('AI 转写结果格式不正确')
    }
    return { transcript: value.transcript }
  }

  async generateDreamImage(input: GenerateDreamImageInput, signal: AbortSignal): Promise<Blob> {
    const response = await this.request(
      '/image',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      },
      120_000,
      signal,
    )
    const image = await response.blob()
    if (!image.type.startsWith('image/') || !image.size) throw new Error('AI 生图服务没有返回图片')
    return image
  }

  private async request(
    path: string,
    init: RequestInit,
    timeoutMs: number,
    externalSignal: AbortSignal,
  ): Promise<Response> {
    const controller = new AbortController()
    let timedOut = false
    const abortFromCaller = () => controller.abort(externalSignal.reason)
    if (externalSignal.aborted) abortFromCaller()
    else externalSignal.addEventListener('abort', abortFromCaller, { once: true })
    const timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, timeoutMs)

    try {
      const response = await this.fetcher.call(globalThis, `${this.endpoint}${path}`, {
        ...init,
        signal: controller.signal,
      })
      if (!response.ok) throw new Error(`AI 服务请求失败（${response.status}）`)
      return response
    } catch (error) {
      if (timedOut) throw new Error('AI 请求超时')
      if (controller.signal.aborted) throw new Error('AI 请求已取消')
      throw error
    } finally {
      clearTimeout(timer)
      externalSignal.removeEventListener('abort', abortFromCaller)
    }
  }
}

function isOrganizeResult(value: unknown): value is OrganizeDreamResult {
  if (typeof value !== 'object' || value === null) return false
  const result = value as Record<string, unknown>
  return (
    typeof result.title === 'string' &&
    result.title.trim().length > 0 &&
    result.title.length <= 80 &&
    typeof result.summary === 'string' &&
    result.summary.trim().length > 0 &&
    result.summary.length <= 1_000 &&
    typeof result.mood === 'string' &&
    dreamMoods.has(result.mood) &&
    Array.isArray(result.keywords) &&
    result.keywords.length <= 12 &&
    result.keywords.every(
      (keyword) => typeof keyword === 'string' && keyword.trim().length > 0 && keyword.length <= 30,
    )
  )
}
