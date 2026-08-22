import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import WorksPage from './WorksPage.vue'
import { useWorkStore } from '@/stores/works'
import * as cloudWorks from '@/services/cloudWorks'
import * as cloudDrinkRequests from '@/services/cloudDrinkRequests'
import * as workPhotos from '@/services/workPhotos'
import { addCustomWorkCocktailOption } from '@/utils/workFormOptions'

enableAutoUnmount(afterEach)
vi.setConfig({ testTimeout: 15000 })

describe('WorksPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
    setActivePinia(createPinia())
  })

  it('does not save a work record from the form submit event', async () => {
    const wrapper = mount(WorksPage)
    const works = useWorkStore()

    await wrapper
      .get('input[placeholder="例如 想见你 / 白桃乌龙 / 自由特调"]')
      .setValue('无酒精晚杯')
    await wrapper.get('form').trigger('submit')

    expect(works.items).toHaveLength(0)
  })

  it('saves a work record without base liquor and clears the form after clicking save', async () => {
    const wrapper = mount(WorksPage)
    const works = useWorkStore()

    await wrapper
      .get('input[placeholder="例如 想见你 / 白桃乌龙 / 自由特调"]')
      .setValue('无酒精晚杯')
    await wrapper
      .get('textarea[placeholder="自由记录，例如：冰块、柠檬片、薄荷叶，或补充具体用量。"]')
      .setValue('柠檬片\n冰块')
    await wrapper.get('[data-testid="work-save-button"]').trigger('click')

    expect(works.items).toHaveLength(1)
    expect(works.items[0]).toMatchObject({
      cocktailName: '无酒精晚杯',
      ingredientsText: '柠檬片\n冰块',
    })
    expect(
      wrapper.get<HTMLInputElement>('input[placeholder="例如 想见你 / 白桃乌龙 / 自由特调"]')
        .element.value,
    ).toBe('')
    expect(
      wrapper.get<HTMLTextAreaElement>(
        'textarea[placeholder="自由记录，例如：冰块、柠檬片、薄荷叶，或补充具体用量。"]',
      ).element.value,
    ).toBe('')
  })

  it('caches and uploads the selected original and preview after saving a work', async () => {
    const original = new File(['original'], 'night.png', { type: 'image/png' })
    const preview = new Blob(['preview'], { type: 'image/jpeg' })
    vi.spyOn(workPhotos, 'prepareWorkPhoto').mockResolvedValue({
      revision: 'photo-r1',
      original,
      preview,
      previewDataUrl: 'data:image/jpeg;base64,preview',
    })
    const wrapper = mount(WorksPage)
    const works = useWorkStore()
    const attach = vi.spyOn(works, 'attachPreparedPhoto').mockResolvedValue({} as never)

    const photoInput = wrapper.get<HTMLInputElement>('[data-testid="work-photo-input"]')
    Object.defineProperty(photoInput.element, 'files', { value: [original], configurable: true })
    await photoInput.trigger('change')
    await flushPromises()
    await wrapper.get('input[placeholder="例如 想见你 / 白桃乌龙 / 自由特调"]').setValue('照片作品')
    await wrapper.get('[data-testid="work-save-button"]').trigger('click')
    await flushPromises()

    expect(attach).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ revision: 'photo-r1', original, preview }),
    )
  })

  it('keeps a photo pending locally and reports save success when cloud sync is unavailable', async () => {
    cloudWorks.replaceCloudWorksSession({
      accountName: 'mix',
      accountNameKey: 'account-key',
      passwordVerifier: 'password-verifier',
      updatedAt: '2026-08-22T10:00:00.000Z',
    })
    const original = new File(['original'], 'night.png', { type: 'image/png' })
    const preview = new Blob(['preview'], { type: 'image/jpeg' })
    vi.spyOn(workPhotos, 'prepareWorkPhoto').mockResolvedValue({
      revision: 'pending-r1',
      original,
      preview,
      previewDataUrl: 'data:image/jpeg;base64,pending',
    })
    const upload = vi.spyOn(workPhotos, 'uploadCachedWorkPhoto').mockResolvedValue({
      photoOriginalObjectKey: 'photos/a/work/pending-r1/original.png',
      photoPreviewObjectKey: 'photos/a/work/pending-r1/preview.jpg',
      photoOriginalName: 'night.png',
      photoOriginalMime: 'image/png',
      photoOriginalSize: original.size,
      photoRevision: 'pending-r1',
      photoBackupMode: 'original-and-preview',
    })
    const wrapper = mount(WorksPage)
    const works = useWorkStore()
    const push = vi.spyOn(works, 'pushAllToCloud').mockRejectedValue(new Error('网络暂不可用'))
    expect(works.cloudAccount.accountName).toBe('mix')

    const photoInput = wrapper.get<HTMLInputElement>('[data-testid="work-photo-input"]')
    Object.defineProperty(photoInput.element, 'files', { value: [original], configurable: true })
    await photoInput.trigger('change')
    await flushPromises()
    await wrapper
      .get('input[placeholder="例如 想见你 / 白桃乌龙 / 自由特调"]')
      .setValue('离线照片作品')
    await wrapper.get('[data-testid="work-save-button"]').trigger('click')
    await flushPromises()

    await vi.waitFor(() => {
      expect(works.items[0]).toMatchObject({
        cocktailName: '离线照片作品',
        photoRevision: 'pending-r1',
        photoBackupMode: 'none',
      })
      expect(push).toHaveBeenCalledOnce()
    })
    expect(wrapper.get('[role="dialog"]').text()).toContain('保存成功')
    expect(wrapper.get('[role="dialog"]').text()).toContain('已保存在本机')
    expect(wrapper.get('[role="dialog"]').text()).toContain('稍后')
    expect(upload).not.toHaveBeenCalled()
  })

  it('shows a consistent error dialog when saving fails validation', async () => {
    const wrapper = mount(WorksPage)
    const works = useWorkStore()

    await wrapper.get('[data-testid="work-save-button"]').trigger('click')

    expect(works.items).toHaveLength(0)
    expect(wrapper.get('[role="dialog"]').text()).toContain('保存失败')
    expect(wrapper.get('[role="dialog"]').text()).toContain('请先填写作品名称。')
  })

  it('shows a storage error dialog and keeps the form when browser persistence fails', async () => {
    const wrapper = mount(WorksPage)
    const works = useWorkStore()
    const setItem = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    })

    try {
      await wrapper
        .get('input[placeholder="例如 想见你 / 白桃乌龙 / 自由特调"]')
        .setValue('大图作品')
      await wrapper.get('[data-testid="work-save-button"]').trigger('click')

      expect(works.items).toHaveLength(0)
      expect(wrapper.get('[role="dialog"]').text()).toContain('保存失败')
      expect(wrapper.get('[role="dialog"]').text()).toContain('浏览器本地存储空间不足')
      expect(
        wrapper.get<HTMLInputElement>('input[placeholder="例如 想见你 / 白桃乌龙 / 自由特调"]')
          .element.value,
      ).toBe('大图作品')
    } finally {
      setItem.mockRestore()
    }
  })

  it('shows a success dialog after saving and keeps edited custom cocktail records after reload', async () => {
    const custom = addCustomWorkCocktailOption({
      nameZh: '自定义海盐杯',
      ingredientsText: '饮料：葡萄味气泡水',
      ingredientGroups: {
        baseLiquors: [],
        flavorLiquors: [],
        beverages: ['葡萄味气泡水'],
        other: '海盐',
      },
    })
    const works = useWorkStore()
    const item = works.add({
      madeAt: '2026-08-02',
      cocktailSlug: custom?.value ?? '',
      cocktailName: '自定义海盐杯',
      photoDataUrl: '',
      ingredientsText: '饮料：葡萄味气泡水',
      ingredientGroups: {
        baseLiquors: [],
        flavorLiquors: [],
        beverages: ['葡萄味气泡水'],
        other: '海盐',
      },
      rating: 0,
      mood: '',
      selfReview: '',
      notes: '',
    })
    const wrapper = mount(WorksPage)

    await wrapper.get('[data-testid="work-list-summary"]').trigger('click')
    await wrapper.get(`[aria-label="编辑 ${item.cocktailName}"]`).trigger('click')
    await wrapper
      .get('input[placeholder="例如 想见你 / 白桃乌龙 / 自由特调"]')
      .setValue('自定义海盐杯改良版')
    await wrapper
      .get('textarea[placeholder="场景、朋友反馈、杯型或装饰。"]')
      .setValue('加了新照片和备注')
    await wrapper.get('[data-testid="work-save-button"]').trigger('click')

    expect(wrapper.get('[role="dialog"]').text()).toContain('保存成功')
    expect(works.items[0]).toMatchObject({
      id: item.id,
      cocktailName: '自定义海盐杯改良版',
      notes: '加了新照片和备注',
    })

    setActivePinia(createPinia())
    const restored = useWorkStore()
    expect(restored.items[0]).toMatchObject({
      id: item.id,
      cocktailName: '自定义海盐杯改良版',
      notes: '加了新照片和备注',
    })
  })

  it('filters visible work records before sharing', async () => {
    const works = useWorkStore()
    works.add({
      madeAt: '2026-08-01',
      cocktailSlug: '',
      cocktailName: '金酒高分',
      photoDataUrl: '',
      ingredientsText: '',
      ingredientGroups: {
        baseLiquors: ['金酒'],
        flavorLiquors: [],
        beverages: [],
        other: '柠檬片',
      },
      rating: 5,
      mood: '',
      selfReview: '',
      notes: '',
    })
    works.add({
      madeAt: '2026-08-02',
      cocktailSlug: '',
      cocktailName: '伏特加高分',
      photoDataUrl: '',
      ingredientsText: '',
      ingredientGroups: {
        baseLiquors: ['伏特加'],
        flavorLiquors: [],
        beverages: [],
        other: '',
      },
      rating: 5,
      mood: '',
      selfReview: '',
      notes: '',
    })
    works.add({
      madeAt: '2026-08-03',
      cocktailSlug: '',
      cocktailName: '金酒低分',
      photoDataUrl: '',
      ingredientsText: '',
      ingredientGroups: {
        baseLiquors: ['金酒'],
        flavorLiquors: [],
        beverages: [],
        other: '',
      },
      rating: 2,
      mood: '',
      selfReview: '',
      notes: '',
    })
    const wrapper = mount(WorksPage)

    await wrapper.get('[data-testid="work-filter-base"]').setValue('金酒')
    await wrapper.get('[data-testid="work-filter-rating"]').setValue('4')

    expect(wrapper.text()).not.toContain('金酒高分')
    expect(wrapper.text()).not.toContain('伏特加高分')
    expect(wrapper.text()).not.toContain('金酒低分')
    expect(wrapper.text()).toContain('当前显示 1 条')
    expect(wrapper.get('[data-testid="work-list-summary"]').text()).toContain('当前有 1 个酒')

    await wrapper.get('[data-testid="work-list-summary"]').trigger('click')

    expect(wrapper.text()).toContain('金酒高分')
    expect(wrapper.text()).not.toContain('伏特加高分')
    expect(wrapper.text()).not.toContain('金酒低分')
  })

  it('keeps work cards hidden until the user expands the work list', async () => {
    const works = useWorkStore()
    works.add({
      madeAt: '2026-08-01',
      cocktailSlug: '',
      cocktailName: '折叠作品',
      photoDataUrl: '',
      ingredientsText: '基酒：金酒\n饮料：汤力水',
      rating: 4,
      mood: '清爽',
      selfReview: '比例不错',
      notes: '杯型好看',
    })
    const wrapper = mount(WorksPage)

    expect(wrapper.get('[data-testid="work-list-summary"]').text()).toContain('当前有 1 个酒')
    expect(wrapper.text()).not.toContain('折叠作品')
    expect(wrapper.text()).not.toContain('基酒：金酒')
    expect(wrapper.text()).not.toContain('杯型好看')

    await wrapper.get('[data-testid="work-list-summary"]').trigger('click')

    expect(wrapper.text()).toContain('折叠作品')
    expect(wrapper.text()).not.toContain('基酒：金酒')
    expect(wrapper.text()).not.toContain('杯型好看')

    await wrapper.get('[data-testid="work-expand-toggle"]').trigger('click')

    expect(wrapper.text()).toContain('基酒：金酒')
    expect(wrapper.text()).toContain('杯型好看')
  })

  it('shows friendly placeholders for empty date filters', async () => {
    const wrapper = mount(WorksPage)

    expect(wrapper.get('[data-testid="work-filter-start-placeholder"]').text()).toBe(
      '请选择开始日期',
    )
    expect(wrapper.get('[data-testid="work-filter-end-placeholder"]').text()).toBe('请选择结束日期')

    await wrapper.get('input[data-testid="work-filter-start-date"]').setValue('2026-08-01')

    expect(wrapper.get('[data-testid="work-filter-start-placeholder"]').text()).toBe('2026-08-01')
  })

  it('toggles automatic cloud backup from the sharing panel', async () => {
    const wrapper = mount(WorksPage)
    const works = useWorkStore()

    await wrapper.get('[data-testid="auto-cloud-backup-toggle"]').setValue(true)

    expect(works.autoBackup.enabled).toBe(true)
    expect(wrapper.text()).toContain('自动备份已开启')
  })

  it('checks the cloud automatically and exposes a manual refresh with backup counts', async () => {
    cloudWorks.replaceCloudWorksSession({
      accountName: 'mix',
      accountNameKey: 'account-key',
      passwordVerifier: 'password-verifier',
      updatedAt: '2026-08-22T10:00:00.000Z',
    })
    const works = useWorkStore()
    works.cloudSnapshot = {
      status: 'ready',
      relation: 'same-base',
      checkedAt: '2026-08-22T10:05:00.000Z',
      message: '本机与云端备份版本一致。',
      snapshot: {
        status: 'matched',
        accountName: 'mix',
        snapshotId: 'snapshot-1',
        backupCreatedAt: '2026-08-22T10:00:00.000Z',
        dataLastBackupAt: '2026-08-22T09:59:00.000Z',
        recordCount: 17,
        summary: {
          works: 17,
          previewPhotos: 16,
          originalPhotos: 15,
          pantry: 8,
          favorites: 6,
          academy: 4,
          dailyPick: 1,
          customCocktails: 2,
          customFlavorLiquors: 3,
          customBeverages: 5,
        },
      },
    }
    const refresh = vi
      .spyOn(works, 'refreshCloudSnapshot')
      .mockResolvedValue(works.cloudSnapshot.snapshot)

    const wrapper = mount(WorksPage)
    await flushPromises()

    expect(refresh).toHaveBeenCalledTimes(1)
    const summary = wrapper.get('[data-testid="cloud-summary-panel"]')
    expect(summary.text()).toContain('17 个作品')
    expect(summary.text()).toContain('16 张预览图')
    expect(summary.text()).toContain('15 张原图')
    expect(summary.text()).toContain('酒柜 8')
    expect(summary.text()).toContain('收藏 6')

    await wrapper.get('[data-testid="cloud-summary-refresh"]').trigger('click')
    await flushPromises()

    expect(refresh).toHaveBeenCalledTimes(2)
  })

  it('previews the complete replacement before restoring and supports undo', async () => {
    cloudWorks.replaceCloudWorksSession({
      accountName: 'mix',
      accountNameKey: 'account-key',
      passwordVerifier: 'password-verifier',
      updatedAt: '2026-08-22T10:00:00.000Z',
    })
    const works = useWorkStore()
    vi.spyOn(works, 'refreshCloudSnapshot').mockResolvedValue(null)
    const preview = {
      appData: cloudWorks.createEmptyCloudAppData(),
      snapshotId: 'snapshot-restore',
      backupCreatedAt: '2026-08-22T10:00:00.000Z',
      dataLastBackupAt: '2026-08-22T09:59:00.000Z',
      localSummary: {
        works: 3,
        previewPhotos: 2,
        originalPhotos: 1,
        pantry: 4,
        favorites: 5,
        academy: 6,
        dailyPick: 1,
        customCocktails: 2,
        customFlavorLiquors: 3,
        customBeverages: 4,
      },
      cloudSummary: {
        works: 17,
        previewPhotos: 16,
        originalPhotos: 15,
        pantry: 8,
        favorites: 6,
        academy: 4,
        dailyPick: 1,
        customCocktails: 3,
        customFlavorLiquors: 2,
        customBeverages: 1,
      },
    }
    const prepare = vi.spyOn(works, 'prepareCloudRestore').mockResolvedValue(preview)
    const restore = vi.spyOn(works, 'restorePreparedCloudData').mockResolvedValue(17)
    const undo = vi.spyOn(works, 'undoLastCloudRestore').mockResolvedValue(3)
    const nativeConfirm = vi.spyOn(window, 'confirm')
    const wrapper = mount(WorksPage)
    await flushPromises()

    await wrapper.get('[data-testid="cloud-restore-start"]').trigger('click')
    await flushPromises()

    expect(prepare).toHaveBeenCalledOnce()
    expect(nativeConfirm).not.toHaveBeenCalled()
    const dialog = wrapper.get('[data-testid="cloud-restore-dialog"]')
    expect(dialog.text()).toContain('恢复前确认')
    expect(dialog.text()).toContain('本机 3')
    expect(dialog.text()).toContain('云端 17')
    expect(dialog.text()).toContain('酒柜')
    expect(dialog.text()).toContain('课程进度')
    expect(dialog.text()).toContain('将覆盖当前账号完整数据包')

    await wrapper.get('[data-testid="cloud-restore-confirm"]').trigger('click')
    await flushPromises()

    expect(restore).toHaveBeenCalledWith(preview)
    expect(wrapper.find('[data-testid="cloud-restore-dialog"]').exists()).toBe(false)

    works.restoreCheckpointAvailable = true
    await wrapper.vm.$nextTick()
    await wrapper.get('[data-testid="cloud-restore-undo"]').trigger('click')
    await flushPromises()
    expect(undo).toHaveBeenCalledOnce()
  })

  it('previews and confirms complete local replacement before switching cloud accounts', async () => {
    const works = useWorkStore()
    works.add({
      madeAt: '2026-08-22',
      cocktailSlug: '',
      cocktailName: '当前本地作品',
      photoDataUrl: '',
      ingredientsText: '金酒、汤力水',
      rating: 4,
      mood: '',
      selfReview: '',
      notes: '',
    })
    const preview = {
      session: {
        accountName: 'target',
        accountNameKey: 'target-key',
        passwordVerifier: 'target-password',
        updatedAt: '2026-08-22T10:00:00.000Z',
      },
      status: 'matched' as const,
      appData: {
        ...cloudWorks.createEmptyCloudAppData(),
        works: [
          {
            ...works.items[0],
            id: 'target-work',
            cocktailName: '云端目标作品',
            photoDataUrl: '',
          },
        ],
      },
      recordCount: 1,
    }
    const previewAccount = vi.spyOn(works, 'previewCloudAccount').mockResolvedValue(preview)
    const activateAccount = vi.spyOn(works, 'activateCloudAccount').mockResolvedValue(1)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    const wrapper = mount(WorksPage)

    await wrapper.get('[data-testid="cloud-account-name"]').setValue('target')
    await wrapper.get('[data-testid="cloud-account-password"]').setValue('secret')
    await wrapper.get('[data-testid="cloud-account-login"]').trigger('click')
    await flushPromises()

    expect(previewAccount).toHaveBeenCalledWith('target', 'secret')
    expect(confirm.mock.calls[0]?.[0]).toContain(
      '作品和照片、酒柜、收藏、课程进度、每日推荐、自定义材料及自动备份设置',
    )
    expect(activateAccount).not.toHaveBeenCalled()
    expect(works.items[0].cocktailName).toBe('当前本地作品')

    await wrapper.get('[data-testid="cloud-account-login"]').trigger('click')
    await flushPromises()

    expect(activateAccount).toHaveBeenCalledWith(preview)
  })

  it('shows full preview restore progress with pause and retry controls', async () => {
    const works = useWorkStore()
    works.photoRestore = {
      status: 'restoring',
      completed: 2,
      total: 5,
      failedWorkIds: [],
      message: '正在恢复全部作品预览图（2/5）...',
    }
    const pause = vi.spyOn(works, 'pausePhotoRestore')
    const wrapper = mount(WorksPage)

    expect(wrapper.get('[data-testid="work-photo-restore-panel"]').text()).toContain('2/5')
    await wrapper.get('[data-testid="work-photo-restore-pause"]').trigger('click')
    expect(pause).toHaveBeenCalled()

    works.photoRestore = {
      status: 'error',
      completed: 5,
      total: 5,
      failedWorkIds: ['work-1'],
      message: '1 张失败，可重试。',
    }
    await wrapper.vm.$nextTick()
    const retry = vi.spyOn(works, 'restorePhotoPreviews').mockResolvedValue({
      completed: 1,
      total: 1,
      failedWorkIds: [],
    })
    await wrapper.get('[data-testid="work-photo-restore-retry"]').trigger('click')
    expect(retry).toHaveBeenCalled()
  })

  it('prompts and uploads automatically when the last cloud backup is older than one day', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-07T10:00:00.000Z'))
    vi.spyOn(cloudWorks, 'fetchCloudSnapshotSummary').mockResolvedValue({
      status: 'matched',
      accountName: 'mix',
      snapshotId: 'snapshot-before-upload',
      backupCreatedAt: '2026-08-06T10:00:00.000Z',
      dataLastBackupAt: '2026-08-06T09:59:59.000Z',
      recordCount: 1,
      summary: {
        works: 1,
        previewPhotos: 0,
        originalPhotos: 0,
        pantry: 0,
        favorites: 0,
        academy: 0,
        dailyPick: 0,
        customCocktails: 0,
        customFlavorLiquors: 0,
        customBeverages: 0,
      },
    })
    const push = vi.spyOn(cloudWorks, 'syncCloudMetadataPatch').mockResolvedValue({
      snapshotId: 'snapshot-after-upload',
      recordCount: 1,
    })
    window.localStorage.setItem(
      'twilight_cloud_works_session',
      JSON.stringify({
        accountName: 'mix',
        accountNameKey: 'account-key',
        passwordVerifier: 'password-verifier',
        updatedAt: '2026-08-05T00:00:00.000Z',
      }),
    )
    window.localStorage.setItem(
      'cocktail_work_auto_backup',
      JSON.stringify({
        enabled: true,
        lastBackupAt: '2026-08-06T09:59:59.000Z',
      }),
    )
    window.localStorage.setItem(
      'cocktail_work_records',
      JSON.stringify([
        {
          id: 'auto-backup-work',
          madeAt: '2026-08-06',
          cocktailSlug: '',
          cocktailName: '自动备份作品',
          photoDataUrl: '',
          ingredientsText: '饮料：苏打水',
          rating: 0,
          mood: '',
          selfReview: '',
          notes: '',
          createdAt: '2026-08-06T12:00:00.000Z',
        },
      ]),
    )

    try {
      const wrapper = mount(WorksPage)
      await wrapper.vm.$nextTick()

      expect(wrapper.get('[role="dialog"]').text()).toContain('自动备份提醒')
      await wrapper.get('[data-testid="auto-backup-confirm"]').trigger('click')
      await flushPromises()

      const works = useWorkStore()
      expect(push).toHaveBeenCalledWith(expect.objectContaining({ worksChanged: works.items }))
      expect(works.autoBackup.lastBackupAt).toBe('2026-08-07T10:00:00.000Z')
      expect(wrapper.text()).toContain(
        '已同步账号数据到 CloudBase 云端（作品 1 条，变更 1 条，照片使用 OSS 备份）。',
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it('manages the friend drink request share link and displays requests', async () => {
    window.localStorage.setItem(
      'twilight_cloud_works_session',
      JSON.stringify({
        accountName: 'mix',
        accountNameKey: 'account-key',
        passwordVerifier: 'password-verifier',
        updatedAt: '2026-08-07T00:00:00.000Z',
      }),
    )
    vi.spyOn(cloudDrinkRequests, 'getDrinkRequestShare').mockResolvedValue({
      enabled: false,
      token: '',
      url: '',
      requestCount: 0,
      updatedAt: '',
    })
    vi.spyOn(cloudDrinkRequests, 'fetchDrinkRequests').mockResolvedValue([
      {
        id: 'req-1',
        guestName: '朋友',
        cocktailName: '冰岛',
        ingredientGroups: {
          baseLiquors: ['伏特加'],
          flavorLiquors: [],
          beverages: ['葡萄味气泡水'],
          other: '',
        },
        note: '少甜',
        createdAt: '2026-08-07T12:00:00.000Z',
      },
    ])
    vi.spyOn(cloudDrinkRequests, 'resetDrinkRequestShare').mockResolvedValue({
      enabled: true,
      token: 'share-token',
      url: 'https://example.com/#/want/share-token',
      requestCount: 1,
      updatedAt: '2026-08-07T12:00:00.000Z',
    })
    vi.spyOn(cloudDrinkRequests, 'disableDrinkRequestShare').mockResolvedValue()
    vi.spyOn(cloudDrinkRequests, 'deleteDrinkRequest').mockResolvedValue()

    const wrapper = mount(WorksPage)
    await flushPromises()

    expect(wrapper.text()).toContain('朋友想喝')
    expect(wrapper.get('[data-testid="drink-request-summary"]').text()).toContain(
      '当前有 1 条朋友点单',
    )
    expect(wrapper.find('[data-testid="drink-request-list"]').exists()).toBe(false)
    expect(wrapper.get('[role="dialog"]').text()).toContain('朋友想喝提醒')
    await wrapper.get('[data-testid="drink-request-view-new"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="drink-request-list"]').text()).toContain('冰岛')
    await wrapper.get('[data-testid="drink-request-summary"]').trigger('click')
    expect(wrapper.find('[data-testid="drink-request-list"]').exists()).toBe(false)
    await wrapper.get('[data-testid="drink-request-summary"]').trigger('click')

    await wrapper.get('[data-testid="drink-request-delete"]').trigger('click')
    await flushPromises()

    expect(cloudDrinkRequests.deleteDrinkRequest).toHaveBeenCalledWith('req-1')
    await wrapper.get('[data-testid="drink-share-reset"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('https://example.com/#/want/share-token')
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await wrapper.get('[data-testid="drink-share-disable"]').trigger('click')
    await flushPromises()

    expect(cloudDrinkRequests.disableDrinkRequestShare).toHaveBeenCalled()
    expect(wrapper.text()).toContain('分享链接已关闭')
  })

  it('keeps the friend share active when closing all requests is not confirmed', async () => {
    window.localStorage.setItem(
      'twilight_cloud_works_session',
      JSON.stringify({
        accountName: 'mix',
        accountNameKey: 'account-key',
        passwordVerifier: 'password-verifier',
        updatedAt: '2026-08-07T00:00:00.000Z',
      }),
    )
    vi.spyOn(cloudDrinkRequests, 'getDrinkRequestShare').mockResolvedValue({
      enabled: true,
      token: 'share-token',
      url: 'https://example.com/#/want/share-token',
      requestCount: 1,
      updatedAt: '2026-08-07T12:00:00.000Z',
    })
    vi.spyOn(cloudDrinkRequests, 'fetchDrinkRequests').mockResolvedValue([
      {
        id: 'req-1',
        guestName: '朋友',
        cocktailName: '冰岛',
        ingredientGroups: {
          baseLiquors: ['伏特加'],
          flavorLiquors: [],
          beverages: ['葡萄味气泡水'],
          other: '',
        },
        note: '少甜',
        createdAt: '2026-08-07T12:00:00.000Z',
      },
    ])
    const disable = vi.spyOn(cloudDrinkRequests, 'disableDrinkRequestShare').mockResolvedValue()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const wrapper = mount(WorksPage)
    await flushPromises()

    await wrapper.get('[data-testid="drink-share-disable"]').trigger('click')

    expect(confirm).toHaveBeenCalledWith(
      '关闭后当前链接立即失效，并永久删除该链接下全部 1 条点单，是否继续？',
    )
    expect(disable).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('https://example.com/#/want/share-token')

    confirm.mockReturnValue(true)
    await wrapper.get('[data-testid="drink-share-disable"]').trigger('click')
    await flushPromises()

    expect(disable).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[data-testid="drink-request-summary"]').text()).toContain(
      '当前有 0 条朋友点单',
    )
  })
})
