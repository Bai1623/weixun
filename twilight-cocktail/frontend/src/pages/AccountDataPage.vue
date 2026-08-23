<template>
  <div class="page-stack mx-auto max-w-5xl">
    <ConfirmDialog
      v-if="confirmDialog"
      title-id="account-data-confirm-title"
      :eyebrow="confirmDialog.eyebrow"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :confirm-label="confirmDialog.confirmLabel"
      :cancel-label="confirmDialog.cancelLabel"
      :pending="isConfirming"
      :pending-label="confirmDialog.pendingLabel"
      :tone="confirmDialog.tone"
      @cancel="cancelConfirmDialog"
      @confirm="confirmPendingAction"
    />

    <div
      v-if="cloudRestorePreview"
      class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-obsidian/80 px-4 py-8 backdrop-blur-sm"
      role="presentation"
      @click.self="cancelCloudRestore"
    >
      <div
        data-testid="cloud-restore-dialog"
        class="w-full max-w-xl rounded-lg border border-gold/20 bg-walnut p-5 shadow-2xl shadow-black/40"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cloud-restore-dialog-title"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs uppercase tracking-[0.22em] text-gold">Cloud Restore</p>
            <h3 id="cloud-restore-dialog-title" class="mt-2 font-display text-2xl text-cream">
              恢复前确认
            </h3>
          </div>
          <button
            class="rounded-md border border-gold/20 p-2 text-gold transition hover:bg-gold/10"
            type="button"
            aria-label="取消云端恢复"
            @click="cancelCloudRestore"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
        <p class="mt-3 text-sm leading-6 text-muted">
          云端备份时间：{{
            formatCloudDate(cloudRestorePreview.backupCreatedAt)
          }}。确认后将覆盖当前账号完整数据包，并先创建一次可撤销的本地恢复点。
        </p>
        <div class="mt-4 overflow-hidden rounded-lg border border-gold/15">
          <div class="grid grid-cols-[1fr_5rem_5rem] bg-obsidian/55 px-3 py-2 text-xs text-muted">
            <span>数据范围</span>
            <span class="text-right">本机</span>
            <span class="text-right">云端</span>
          </div>
          <div
            v-for="row in cloudRestoreRows"
            :key="row.label"
            class="grid grid-cols-[1fr_5rem_5rem] border-t border-gold/10 px-3 py-2 text-sm"
          >
            <span class="text-cream/85">{{ row.label }}</span>
            <span class="text-right text-muted">本机 {{ row.local }}</span>
            <span class="text-right text-gold">云端 {{ row.cloud }}</span>
          </div>
        </div>
        <p
          class="mt-4 rounded-md border border-wine/50 bg-wine/15 px-3 py-2 text-sm leading-6 text-cream"
        >
          将覆盖当前账号完整数据包：作品和照片、酒柜、收藏、课程进度、每日推荐、自定义材料及自动备份设置。
        </p>
        <div
          v-if="cloudRestoreError"
          class="mt-3 rounded-md border border-wine/60 bg-wine/20 px-3 py-3 text-sm leading-6 text-cream"
          role="alert"
        >
          <p>{{ cloudRestoreError }}</p>
          <button
            data-testid="cloud-restore-refresh"
            class="mt-3 rounded-md border border-gold/30 px-3 py-2 text-sm text-gold transition hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            :disabled="isCloudBusy"
            @click="loadCloudRestorePreview"
          >
            {{ isCloudBusy ? '重新读取中' : '重新检查云端备份' }}
          </button>
        </div>
        <div class="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            class="ui-button-secondary px-4 py-3 text-sm"
            type="button"
            :disabled="isCloudBusy"
            @click="cancelCloudRestore"
          >
            取消
          </button>
          <button
            data-testid="cloud-restore-confirm"
            class="inline-flex items-center justify-center gap-2 rounded-md bg-wine px-4 py-3 text-sm font-semibold text-cream transition hover:bg-wine/80 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            :disabled="isCloudBusy"
            @click="confirmCloudRestore"
          >
            <Download class="h-4 w-4" />
            {{ isCloudBusy ? '恢复中' : '确认覆盖并恢复' }}
          </button>
        </div>
      </div>
    </div>

    <div>
      <RouterLink class="text-sm text-gold hover:text-cream" to="/profile">← 返回我的</RouterLink>
      <SectionHeading
        class="mt-4"
        eyebrow="Account & Data"
        title="账号与数据"
        description="管理云端账号、检查备份、备份本机数据或从云端恢复。"
      />
    </div>

    <section class="ui-panel p-5">
      <div>
        <p class="text-xs uppercase tracking-[0.2em] text-gold">Account</p>
        <h2 class="mt-2 font-display text-2xl text-cream">云端账号</h2>
        <p class="mt-2 text-sm leading-6 text-muted">
          每个账号拥有独立完整数据包。切换账号前会先展示云端范围，并由你确认是否覆盖本机。
        </p>
      </div>
      <div class="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_auto_auto]">
        <label class="space-y-2 text-sm text-muted">
          <span>账号</span>
          <input
            v-model.trim="cloudAccountName"
            data-testid="cloud-account-name"
            class="w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream outline-none focus:ring-2 focus:ring-gold"
            placeholder="例如 baibai"
          />
        </label>
        <label class="space-y-2 text-sm text-muted">
          <span>密码</span>
          <input
            v-model="cloudPassword"
            data-testid="cloud-account-password"
            class="w-full rounded-md border border-gold/20 bg-obsidian px-3 py-3 text-cream outline-none focus:ring-2 focus:ring-gold"
            placeholder="输入账号密码"
            type="password"
            @keydown.enter.prevent="previewCloudAccount"
          />
        </label>
        <button
          data-testid="cloud-account-login"
          class="ui-button-primary mt-auto px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          :disabled="isCloudBusy"
          @click="previewCloudAccount"
        >
          {{ works.cloudAccount.accountName ? '切换账号' : '登录或创建' }}
        </button>
        <button
          class="ui-button-secondary mt-auto px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          :disabled="!works.cloudAccount.accountName || isCloudBusy"
          @click="logoutCloudAccount"
        >
          退出账号
        </button>
      </div>
      <p class="mt-3 rounded-md bg-obsidian/45 px-3 py-2 text-sm text-cream">
        {{
          works.cloudAccount.accountName
            ? `当前云端账号：${works.cloudAccount.accountName}`
            : '还未登录云端账号。账号不存在时会自动创建。'
        }}
      </p>
    </section>

    <section class="ui-panel p-5">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.2em] text-gold">Cloud Backup</p>
          <h2 class="mt-2 font-display text-2xl text-cream">云端备份</h2>
          <p class="mt-2 text-sm leading-6 text-muted">
            “检查”只读取云端状态；“备份”将本机数据写入云端；“恢复”会用云端完整数据包覆盖本机。
          </p>
        </div>
        <button
          data-testid="cloud-summary-refresh"
          class="ui-button-secondary shrink-0 px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          :disabled="!works.cloudAccount.accountName || isCheckingCloud || isCloudBusy"
          @click="() => refreshCloudSummary()"
        >
          {{ isCheckingCloud ? '检查中' : '检查云端备份' }}
        </button>
      </div>

      <div
        data-testid="cloud-summary-panel"
        class="mt-4 rounded-lg border border-gold/15 bg-obsidian/35 px-4 py-4"
      >
        <p class="text-sm leading-6 text-cream/85">
          {{
            works.cloudAccount.accountName
              ? works.cloudSnapshot.message
              : '登录云端账号后，会自动检查备份时间和数据范围。'
          }}
        </p>
        <template v-if="cloudSnapshotSummary">
          <p class="mt-3 text-sm font-semibold text-cream">
            {{ cloudSnapshotSummary.works }} 个作品 ·
            {{ cloudSnapshotSummary.previewPhotos }} 张预览图 ·
            {{ cloudSnapshotSummary.originalPhotos }} 张原图
          </p>
          <p class="mt-2 text-sm leading-6 text-muted">
            酒柜 {{ cloudSnapshotSummary.pantry }} · 收藏 {{ cloudSnapshotSummary.favorites }} ·
            课程 {{ cloudSnapshotSummary.academy }} · 每日推荐
            {{ cloudSnapshotSummary.dailyPick }} · 自定义酒单
            {{ cloudSnapshotSummary.customCocktails }} · 自定义风味酒
            {{ cloudSnapshotSummary.customFlavorLiquors }} · 自定义饮料
            {{ cloudSnapshotSummary.customBeverages }}
          </p>
          <p class="mt-2 text-xs leading-5 text-muted">
            云端备份：{{
              formatCloudDate(works.cloudSnapshot.snapshot?.backupCreatedAt || '')
            }}；最近检查：{{ formatCloudDate(works.cloudSnapshot.checkedAt) }}
          </p>
        </template>
      </div>

      <div class="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          data-testid="cloud-backup-start"
          class="ui-button-primary inline-flex items-center justify-center gap-2 px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          :disabled="!works.cloudAccount.accountName || isCloudBusy"
          @click="backupToCloud"
        >
          <Upload class="h-4 w-4" />
          {{ isCloudBusy ? '处理中' : '备份到云端' }}
        </button>
        <button
          data-testid="cloud-restore-start"
          class="inline-flex items-center justify-center gap-2 rounded-md border border-wine/70 px-5 py-3 text-sm text-cream transition hover:bg-wine/20 disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          :disabled="!works.cloudAccount.accountName || isCloudBusy"
          @click="loadCloudRestorePreview"
        >
          <Download class="h-4 w-4" />
          从云端恢复
        </button>
        <button
          v-if="works.hasRestoreCheckpoint"
          data-testid="cloud-restore-undo"
          class="ui-button-secondary px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          :disabled="isCloudBusy"
          @click="undoCloudRestore"
        >
          撤销上次恢复
        </button>
      </div>

      <div
        class="mt-4 rounded-lg border px-4 py-3"
        :class="cloudOperationStatusClass"
        role="status"
      >
        <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.2em] text-gold">最近操作</p>
            <p class="mt-1 text-sm font-semibold text-cream">{{ cloudOperationStatusLabel }}</p>
          </div>
          <p v-if="cloudOperationTimeText" class="text-xs text-muted">
            {{ cloudOperationTimeText }}
          </p>
        </div>
        <p class="mt-2 text-sm leading-6 text-cream/85">{{ works.cloudSync.message }}</p>
      </div>
      <p v-if="pageMessage" class="mt-3 rounded-md bg-obsidian/45 px-3 py-2 text-sm text-cream">
        {{ pageMessage }}
      </p>
    </section>

    <section
      v-if="showPhotoBackupPanel || works.photoRestore.status !== 'idle'"
      class="ui-panel p-5"
    >
      <p class="text-xs uppercase tracking-[0.2em] text-gold">Photos</p>
      <h2 class="mt-2 font-display text-2xl text-cream">照片备份与恢复</h2>

      <div
        v-if="showPhotoBackupPanel"
        data-testid="work-photo-backup-panel"
        class="mt-4 rounded-lg border border-gold/15 bg-obsidian/35 px-4 py-3"
      >
        <p class="text-sm font-semibold text-cream">待备份照片</p>
        <p class="mt-1 text-sm text-muted">{{ works.photoBackup.message }}</p>
        <div v-if="works.photoBackup.issues.length" class="mt-3 space-y-2">
          <div
            v-for="issue in works.photoBackup.issues"
            :key="`${issue.workId}:${issue.revision}`"
            class="flex flex-col gap-3 rounded-md border border-gold/10 bg-obsidian/45 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-cream">{{ issue.workName }}</p>
              <p class="mt-1 text-xs text-muted">
                {{ photoBackupKindLabel(issue.kinds) }} ·
                {{ issue.status === 'failed' ? '备份失败' : '等待备份' }}
              </p>
              <p v-if="issue.errorMessage" class="mt-1 text-xs leading-5 text-cream/75">
                {{ issue.errorMessage }}
              </p>
            </div>
            <button
              data-testid="work-photo-backup-item-retry"
              class="ui-button-secondary shrink-0 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              :disabled="
                !works.cloudAccount.accountName ||
                works.photoBackup.status === 'retrying' ||
                isCloudBusy
              "
              @click="retryPhotoBackupIssue(issue.workId)"
            >
              {{ issue.status === 'failed' ? '重试备份' : '立即备份' }}
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="works.photoRestore.status !== 'idle'"
        data-testid="work-photo-restore-panel"
        class="mt-4 rounded-lg border border-gold/15 bg-obsidian/35 px-4 py-3"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-cream">照片预览恢复</p>
            <p class="mt-1 text-sm text-muted">{{ works.photoRestore.message }}</p>
          </div>
          <div class="flex gap-2">
            <button
              v-if="works.photoRestore.status === 'restoring'"
              data-testid="work-photo-restore-pause"
              class="ui-button-secondary px-3 py-2 text-sm"
              type="button"
              @click="works.pausePhotoRestore"
            >
              暂停
            </button>
            <button
              v-if="works.photoRestore.status === 'paused' || works.photoRestore.status === 'error'"
              data-testid="work-photo-restore-retry"
              class="ui-button-secondary px-3 py-2 text-sm"
              type="button"
              @click="retryPhotoRestore"
            >
              继续或重试
            </button>
          </div>
        </div>
        <div class="mt-3 h-2 overflow-hidden rounded-full bg-cream/10">
          <div
            class="h-full rounded-full bg-gold transition-all"
            :style="{ width: photoRestorePercent }"
          />
        </div>
        <p class="mt-2 text-xs text-muted">
          {{ works.photoRestore.completed }}/{{ works.photoRestore.total }}
        </p>
        <div
          v-if="works.photoRestore.failures.length"
          data-testid="work-photo-restore-failures"
          class="mt-3 space-y-2"
        >
          <div
            v-for="failure in works.photoRestore.failures"
            :key="failure.workId"
            class="flex flex-col gap-3 rounded-md border border-gold/10 bg-obsidian/45 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-cream">
                {{ workNameById(failure.workId) }}
              </p>
              <p class="mt-1 text-xs leading-5 text-cream/75">{{ failure.errorMessage }}</p>
            </div>
            <button
              data-testid="work-photo-restore-item-retry"
              class="ui-button-secondary shrink-0 px-3 py-2 text-sm"
              type="button"
              :disabled="works.photoRestore.status === 'restoring'"
              @click="retryPhotoRestoreIssue(failure.workId)"
            >
              重试此张
            </button>
          </div>
        </div>
      </div>
    </section>

    <section class="ui-panel p-5" data-testid="auto-cloud-backup-panel">
      <label class="flex cursor-pointer items-start justify-between gap-4">
        <span>
          <span class="block font-display text-2xl text-cream">自动备份</span>
          <span class="mt-2 block text-sm leading-6 text-muted">
            打开作品页时检查上次云端备份；超过 1 天会先询问，再备份当前账号数据。
          </span>
        </span>
        <input
          data-testid="auto-cloud-backup-toggle"
          class="mt-1 h-5 w-5 accent-gold"
          type="checkbox"
          :checked="works.autoBackup.enabled"
          @change="toggleAutoBackup"
        />
      </label>
      <p class="mt-3 rounded-md bg-obsidian/45 px-3 py-2 text-sm text-cream">
        {{ autoBackupStatusText }}
      </p>
    </section>

    <section class="ui-panel p-5">
      <p class="text-xs uppercase tracking-[0.2em] text-gold">Local File</p>
      <h2 class="mt-2 font-display text-2xl text-cream">作品 JSON</h2>
      <p class="mt-2 text-sm leading-6 text-muted">
        JSON 只包含作品文字数据，不包含原图、酒柜和其他账号数据。完整跨设备恢复请使用云端备份。
      </p>
      <div class="mt-4 flex flex-wrap gap-3">
        <button
          class="ui-button-secondary inline-flex items-center justify-center gap-2 px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          :disabled="!works.totalCount"
          @click="exportWorksJson"
        >
          <Download class="h-4 w-4" />导出作品 JSON
        </button>
        <label
          class="ui-button-secondary inline-flex cursor-pointer items-center justify-center gap-2 px-4 py-3 text-sm"
        >
          <Upload class="h-4 w-4" />导入作品 JSON
          <input
            class="sr-only"
            type="file"
            accept="application/json,.json"
            @change="importWorksJson"
          />
        </label>
      </div>
    </section>

    <section class="rounded-lg border border-wine/50 bg-wine/10 p-5">
      <h2 class="font-display text-2xl text-cream">清除本机数据</h2>
      <p class="mt-2 text-sm leading-6 text-muted">
        清除当前浏览器内的作品、照片缓存、设置和登录状态。此操作不会删除云端备份。
      </p>
      <button
        data-testid="clear-local-data"
        class="mt-4 rounded-md border border-wine/70 px-4 py-3 text-sm text-cream transition hover:bg-wine/20"
        type="button"
        @click="requestClearLocalData"
      >
        清除本机数据
      </button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Download, Upload, X } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'

import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import SectionHeading from '@/components/common/SectionHeading.vue'
import { clearAllWorkPhotos } from '@/services/workPhotoCache'
import type { CloudAccountPreview } from '@/services/cloudWorks'
import { exportWorkRecords, useWorkStore, type CloudRestorePreview } from '@/stores/works'

type ConfirmDialogState = {
  eyebrow: string
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  pendingLabel: string
  tone: 'default' | 'danger'
  action: () => void | Promise<void>
}

const works = useWorkStore()
const cloudAccountName = ref(works.cloudAccount.accountName)
const cloudPassword = ref('')
const isCloudBusy = ref(false)
const isConfirming = ref(false)
const pageMessage = ref('')
const confirmDialog = ref<ConfirmDialogState | null>(null)
const cloudRestorePreview = ref<CloudRestorePreview | null>(null)
const cloudRestoreError = ref('')

const getToday = () => new Date().toISOString().slice(0, 10)
const isCheckingCloud = computed(() => works.cloudSnapshot.status === 'checking')
const cloudSnapshotSummary = computed(() => works.cloudSnapshot.snapshot?.summary ?? null)
const photoRestorePercent = computed(() => {
  if (!works.photoRestore.total) return '0%'
  return `${Math.min(100, Math.round((works.photoRestore.completed / works.photoRestore.total) * 100))}%`
})
const showPhotoBackupPanel = computed(
  () =>
    works.photoBackup.issues.length > 0 ||
    works.photoBackup.status === 'retrying' ||
    works.photoBackup.status === 'error',
)
const autoBackupLastBackupText = computed(() => {
  if (!works.autoBackup.lastBackupAt) return '还没有云端备份记录。'
  return `上次备份 ${new Date(works.autoBackup.lastBackupAt).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })}`
})
const autoBackupStatusText = computed(() =>
  works.autoBackup.enabled
    ? `自动备份已开启，${autoBackupLastBackupText.value}`
    : '自动备份已关闭，仍可随时手动备份到云端。',
)
const cloudOperationStatusLabel = computed(() => {
  if (works.cloudSync.status === 'syncing') return '处理中'
  if (works.cloudSync.status === 'success') return '操作成功'
  if (works.cloudSync.status === 'error') return '操作失败'
  return '暂无操作'
})
const cloudOperationStatusClass = computed(() => {
  if (works.cloudSync.status === 'syncing') return 'border-gold/35 bg-gold/10'
  if (works.cloudSync.status === 'success') return 'border-cream/20 bg-cream/10'
  if (works.cloudSync.status === 'error') return 'border-wine/60 bg-wine/20'
  return 'border-gold/15 bg-obsidian/45'
})
const cloudOperationTimeText = computed(() => {
  if (!works.cloudSync.updatedAt) return ''
  return `最后更新 ${new Date(works.cloudSync.updatedAt).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })}`
})
const cloudRestoreRows = computed(() => {
  if (!cloudRestorePreview.value) return []
  const { localSummary, cloudSummary } = cloudRestorePreview.value
  return [
    { label: '作品', local: localSummary.works, cloud: cloudSummary.works },
    { label: '预览照片', local: localSummary.previewPhotos, cloud: cloudSummary.previewPhotos },
    { label: '原图', local: localSummary.originalPhotos, cloud: cloudSummary.originalPhotos },
    { label: '酒柜', local: localSummary.pantry, cloud: cloudSummary.pantry },
    { label: '收藏', local: localSummary.favorites, cloud: cloudSummary.favorites },
    { label: '课程进度', local: localSummary.academy, cloud: cloudSummary.academy },
    { label: '每日推荐', local: localSummary.dailyPick, cloud: cloudSummary.dailyPick },
    {
      label: '自定义酒单',
      local: localSummary.customCocktails,
      cloud: cloudSummary.customCocktails,
    },
    {
      label: '自定义风味酒',
      local: localSummary.customFlavorLiquors,
      cloud: cloudSummary.customFlavorLiquors,
    },
    {
      label: '自定义饮料',
      local: localSummary.customBeverages,
      cloud: cloudSummary.customBeverages,
    },
  ]
})

const formatCloudDate = (value: string) => {
  if (!value) return '暂无记录'
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
const photoBackupKindLabel = (kinds: Array<'original' | 'preview'>) => {
  if (kinds.includes('original') && kinds.includes('preview')) return '原图与预览图'
  if (kinds.includes('original')) return '原图'
  return '预览图'
}
const workNameById = (workId: string) =>
  works.items.find((item) => item.id === workId)?.cocktailName || '未命名作品'

const cancelConfirmDialog = () => {
  if (isConfirming.value) return
  confirmDialog.value = null
}
const confirmPendingAction = async () => {
  const dialog = confirmDialog.value
  if (!dialog || isConfirming.value) return
  isConfirming.value = true
  try {
    await dialog.action()
    confirmDialog.value = null
  } catch (error) {
    pageMessage.value = error instanceof Error ? error.message : '操作失败，请稍后重试。'
  } finally {
    isConfirming.value = false
  }
}

const activateCloudAccount = async (preview: CloudAccountPreview) => {
  isCloudBusy.value = true
  try {
    await works.activateCloudAccount(preview)
    cloudAccountName.value = works.cloudAccount.accountName
    cloudPassword.value = ''
    pageMessage.value = works.cloudSync.message
    await refreshCloudSummary(false)
  } catch {
    pageMessage.value = works.cloudSync.message
  } finally {
    isCloudBusy.value = false
  }
}
const previewCloudAccount = async () => {
  pageMessage.value = ''
  isCloudBusy.value = true
  try {
    const preview = await works.previewCloudAccount(cloudAccountName.value, cloudPassword.value)
    const sourceText =
      preview.status === 'new'
        ? `云端账号「${preview.session.accountName}」尚无数据，确认后会创建新账号。`
        : `云端账号「${preview.session.accountName}」现有 ${preview.recordCount} 个作品。`
    confirmDialog.value = {
      eyebrow: 'Account',
      title: works.cloudAccount.accountName ? '确认切换账号' : '确认登录账号',
      message: `${sourceText}\n\n继续后将以该云端账号数据为准，覆盖本机当前账号的作品和照片、酒柜、收藏、课程进度、每日推荐、自定义材料及自动备份设置。`,
      confirmLabel: works.cloudAccount.accountName ? '确认切换' : '确认登录',
      cancelLabel: '取消',
      pendingLabel: '切换中',
      tone: 'danger',
      action: () => activateCloudAccount(preview),
    }
  } catch {
    pageMessage.value = works.cloudSync.message
  } finally {
    isCloudBusy.value = false
  }
}
const logoutCloudAccount = () => {
  works.logoutCloudAccount()
  cloudAccountName.value = ''
  cloudPassword.value = ''
  pageMessage.value = works.cloudSync.message
  cloudRestorePreview.value = null
}
const refreshCloudSummary = async (announce = true) => {
  if (!works.cloudAccount.accountName || isCheckingCloud.value) return
  try {
    await works.refreshCloudSnapshot()
  } catch {
    // The store keeps the actionable error message for the page.
  } finally {
    if (announce) pageMessage.value = works.cloudSnapshot.message
  }
}
const backupToCloud = async () => {
  if (!works.cloudAccount.accountName) return
  pageMessage.value = ''
  isCloudBusy.value = true
  try {
    await works.pushAllToCloud()
  } catch {
    // The store keeps the actionable error message for the page.
  } finally {
    pageMessage.value = works.cloudSync.message
    isCloudBusy.value = false
  }
}
const loadCloudRestorePreview = async () => {
  if (!works.cloudAccount.accountName) return
  pageMessage.value = ''
  cloudRestoreError.value = ''
  isCloudBusy.value = true
  try {
    cloudRestorePreview.value = await works.prepareCloudRestore()
  } catch {
    pageMessage.value = works.cloudSync.message
  } finally {
    isCloudBusy.value = false
  }
}
const cancelCloudRestore = () => {
  cloudRestorePreview.value = null
  cloudRestoreError.value = ''
  pageMessage.value = '已取消恢复，本机账号数据未改变。'
}
const confirmCloudRestore = async () => {
  const preview = cloudRestorePreview.value
  if (!preview) return
  isCloudBusy.value = true
  try {
    await works.restorePreparedCloudData(preview)
    cloudRestorePreview.value = null
    pageMessage.value = works.cloudSync.message
  } catch (error) {
    const message = error instanceof Error ? error.message : works.cloudSync.message
    pageMessage.value = message
    cloudRestoreError.value = message
  } finally {
    isCloudBusy.value = false
  }
}
const undoCloudRestore = async () => {
  isCloudBusy.value = true
  try {
    await works.undoLastCloudRestore()
    pageMessage.value = works.cloudSync.message
  } catch (error) {
    pageMessage.value = error instanceof Error ? error.message : works.cloudSync.message
  } finally {
    isCloudBusy.value = false
  }
}
const retryPhotoBackupIssue = async (workId: string) => {
  isCloudBusy.value = true
  try {
    await works.retryPhotoBackup(workId)
    pageMessage.value = works.cloudSync.message
  } catch {
    pageMessage.value = works.photoBackup.message
  } finally {
    isCloudBusy.value = false
  }
}
const retryPhotoRestore = async () => {
  try {
    await works.restorePhotoPreviews()
  } catch {
    pageMessage.value = works.photoRestore.message
  }
}
const retryPhotoRestoreIssue = async (workId: string) => {
  try {
    await works.retryPhotoRestore(workId)
  } catch {
    pageMessage.value = works.photoRestore.message
  }
}
const toggleAutoBackup = (event: Event) => {
  const enabled = (event.target as HTMLInputElement).checked
  works.setAutoBackupEnabled(enabled)
  pageMessage.value = enabled ? '自动备份已开启。' : '自动备份已关闭。'
}
const exportWorksJson = () => {
  if (!works.totalCount) return
  const blob = new Blob([exportWorkRecords(works.items)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `twilight-mixbook-works-${getToday()}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  pageMessage.value = `已导出 ${works.totalCount} 条作品。`
}
const importWorksJson = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.addEventListener('load', () => {
    const content = typeof reader.result === 'string' ? reader.result : ''
    const result = works.importFromJson(content)
    pageMessage.value =
      result.importedCount > 0
        ? `已导入 ${result.importedCount} 条作品，跳过 ${result.skippedCount} 条重复或无效记录。`
        : '没有导入新作品，请确认 JSON 文件来自暮调作品导出。'
  })
  reader.addEventListener('error', () => {
    pageMessage.value = '读取 JSON 文件失败，请重新选择文件。'
  })
  reader.readAsText(file)
  input.value = ''
}
const requestClearLocalData = () => {
  confirmDialog.value = {
    eyebrow: 'Danger Zone',
    title: '确认清除本机数据',
    message:
      '这会清除当前浏览器内的作品、照片缓存、设置和登录状态，但不会删除云端备份。清除后页面会重新加载。',
    confirmLabel: '确认清除',
    cancelLabel: '取消',
    pendingLabel: '清除中',
    tone: 'danger',
    action: async () => {
      await clearAllWorkPhotos()
      window.localStorage.clear()
      window.location.reload()
    },
  }
}

onMounted(() => {
  void works.refreshPhotoBackupIssues().catch(() => undefined)
  if (works.cloudAccount.accountName) void refreshCloudSummary(false)
})
</script>
