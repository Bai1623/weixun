import { afterEach, describe, expect, it, vi } from 'vitest'

import { HttpDreamAiGateway } from './HttpDreamAiGateway'

const organizeInput = {
  rawText: '我沿着水面走向一扇门',
  metadata: { dreamedAt: '2026-08-25', mood: 'neutral' as const, clarity: 3, lucid: false, tags: [] },
}

function jsonResponse(value: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: vi.fn(async () => value) } as unknown as Response
}

describe('HttpDreamAiGateway', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('posts organized dream JSON to the configured server endpoint', async () => {
    const fetcher = vi.fn(function (this: unknown) {
      expect(this).toBe(globalThis)
      return Promise.resolve(
        jsonResponse({ title: '雾里的门', summary: '沿水远行', mood: 'mysterious', keywords: ['水面', '门'] }),
      )
    })
    const gateway = new HttpDreamAiGateway('https://dream.example/api/', fetcher)

    await expect(gateway.organizeDream(organizeInput, new AbortController().signal)).resolves.toEqual({
      title: '雾里的门',
      summary: '沿水远行',
      mood: 'mysterious',
      keywords: ['水面', '门'],
    })
    expect(fetcher).toHaveBeenCalledWith(
      'https://dream.example/api/organize',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(organizeInput) }),
    )
  })

  it('rejects malformed moods and non-image responses', async () => {
    const invalidOrganize = vi.fn().mockResolvedValue(
      jsonResponse({ title: '标题', summary: '摘要', mood: 'diagnosed', keywords: [] }),
    )
    await expect(
      new HttpDreamAiGateway('https://dream.example', invalidOrganize).organizeDream(
        organizeInput,
        new AbortController().signal,
      ),
    ).rejects.toThrow('AI 整理结果格式不正确')

    const invalidImage = vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn(async () => new Blob(['text'], { type: 'text/plain' })),
    })
    await expect(
      new HttpDreamAiGateway('https://dream.example', invalidImage).generateDreamImage(
        { summary: '摘要', mood: 'neutral', keywords: [] },
        new AbortController().signal,
      ),
    ).rejects.toThrow('AI 生图服务没有返回图片')
  })

  it('aborts organize at 45 seconds and media operations at 120 seconds', async () => {
    vi.useFakeTimers()
    let capturedSignal: AbortSignal | undefined
    const pendingFetch = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
      capturedSignal = init?.signal as AbortSignal
      return new Promise<Response>((_resolve, reject) => {
        capturedSignal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
      })
    })
    const gateway = new HttpDreamAiGateway('https://dream.example', pendingFetch)

    const organize = gateway.organizeDream(organizeInput, new AbortController().signal)
    const organizeRejection = expect(organize).rejects.toThrow('AI 请求超时')
    await vi.advanceTimersByTimeAsync(44_999)
    expect(capturedSignal?.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    await organizeRejection

    const image = gateway.generateDreamImage(
      { summary: '摘要', mood: 'neutral', keywords: [] },
      new AbortController().signal,
    )
    const imageRejection = expect(image).rejects.toThrow('AI 请求超时')
    await vi.advanceTimersByTimeAsync(119_999)
    expect(capturedSignal?.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    await imageRejection
  })

  it('allows HTTPS and local HTTP endpoints but rejects remote insecure HTTP', () => {
    expect(() => new HttpDreamAiGateway('http://localhost:8787')).not.toThrow()
    expect(() => new HttpDreamAiGateway('http://127.0.0.1:8787')).not.toThrow()
    expect(() => new HttpDreamAiGateway('http://dream.example')).toThrow('AI 服务地址必须使用 HTTPS')
  })
})
