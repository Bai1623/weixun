import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  buildDrinkRequestShareUrl,
  disableDrinkRequestShare,
  deleteDrinkRequest,
  fetchDrinkRequests,
  getLocalDrinkRequestShareToken,
  normalizeDrinkRequestInput,
  resetDrinkRequestShare,
  submitDrinkRequest,
} from './cloudDrinkRequests'

const session = {
  accountName: 'mix',
  accountNameKey: 'account-key',
  passwordVerifier: 'password-verifier',
  updatedAt: '2026-08-07T00:00:00.000Z',
}

describe('cloud drink request service', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('builds hash-route share links from the current site origin and path', () => {
    window.history.pushState({}, '', '/weixun-Twilight-Mixbook/?v=old#/works')

    expect(buildDrinkRequestShareUrl('share-token')).toBe(
      `${window.location.origin}/weixun-Twilight-Mixbook/#/want/share-token`,
    )
  })

  it('normalizes one small no-photo drink request and rejects large fields', () => {
    expect(
      normalizeDrinkRequestInput({
        guestName: ' 小白 ',
        cocktailName: ' 想见你 ',
        ingredientGroups: {
          baseLiquors: ['金酒', '', '伏特加', '朗姆酒', '龙舌兰', '威士忌'],
          flavorLiquors: ['蓝橙力娇酒'],
          beverages: ['葡萄味气泡水'],
          other: ' 柠檬片 ',
        },
        note: ' 少甜 ',
      }),
    ).toMatchObject({
      guestName: '小白',
      cocktailName: '想见你',
      ingredientGroups: {
        baseLiquors: ['金酒', '伏特加', '朗姆酒', '龙舌兰'],
        flavorLiquors: ['蓝橙力娇酒'],
        beverages: ['葡萄味气泡水'],
        other: '柠檬片',
      },
      note: '少甜',
    })

    expect(() =>
      normalizeDrinkRequestInput({
        cocktailName: 'a'.repeat(41),
        ingredientGroups: {
          baseLiquors: [],
          flavorLiquors: [],
          beverages: [],
          other: '',
        },
      }),
    ).toThrow('酒名最多 40 个字')
    expect(() =>
      normalizeDrinkRequestInput({
        cocktailName: '带图点单',
        photoDataUrl: 'data:image/jpeg;base64,abc',
        ingredientGroups: {
          baseLiquors: [],
          flavorLiquors: [],
          beverages: [],
          other: '',
        },
      }),
    ).toThrow('朋友点单不支持上传图片')
  })

  it('resets and disables the owner share token with the saved cloud account session', async () => {
    window.localStorage.setItem('twilight_cloud_works_session', JSON.stringify(session))
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, enabled: true, requestCount: 0 }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const share = await resetDrinkRequestShare()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      action: 'request-share-reset',
      accountNameKey: session.accountNameKey,
      passwordVerifier: session.passwordVerifier,
      shareToken: share.token,
    })
    expect(share.url).toContain('#/want/')
    expect(getLocalDrinkRequestShareToken()).toBe(share.token)

    await disableDrinkRequestShare()

    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({
      action: 'request-share-disable',
      accountNameKey: session.accountNameKey,
      passwordVerifier: session.passwordVerifier,
    })
    expect(getLocalDrinkRequestShareToken()).toBe('')
  })

  it('submits a friend request without photo payload and fetches owner requests', async () => {
    window.localStorage.setItem('twilight_cloud_works_session', JSON.stringify(session))
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, status: 'created' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            ok: true,
            requests: [{ id: 'req-1', cocktailName: '冰岛', createdAt: '2026-08-07T00:00:00Z' }],
          }),
      })
    vi.stubGlobal('fetch', fetchMock)

    await submitDrinkRequest('share-token', {
      guestName: '朋友',
      cocktailName: '冰岛',
      photoDataUrl: 'data:image/png;base64,blocked',
      ingredientGroups: {
        baseLiquors: ['伏特加'],
        flavorLiquors: [],
        beverages: ['葡萄味气泡水'],
        other: '',
      },
      note: '',
    })
    const requests = await fetchDrinkRequests()

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      action: 'drink-request-submit',
      shareToken: 'share-token',
      request: {
        guestName: '朋友',
        cocktailName: '冰岛',
      },
    })
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).request).not.toHaveProperty('photoDataUrl')
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({
      action: 'drink-requests-get',
      accountNameKey: session.accountNameKey,
    })
    expect(requests).toHaveLength(1)
  })

  it('deletes one owner drink request with the saved cloud account session', async () => {
    window.localStorage.setItem('twilight_cloud_works_session', JSON.stringify(session))
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, status: 'deleted', requestCount: 0 }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await deleteDrinkRequest('req-1')

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      action: 'drink-request-delete',
      accountNameKey: session.accountNameKey,
      passwordVerifier: session.passwordVerifier,
      requestId: 'req-1',
    })
  })
})
