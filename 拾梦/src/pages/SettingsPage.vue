<template>
  <section class="settings-page">
    <p class="eyebrow">Your quiet space</p>
    <h1 class="page-heading">设置</h1>
    <p class="page-intro">管理本地数据、备份与可选的 AI 功能。</p>

    <div class="settings-list glass-card">
      <div class="settings-item">
        <div>
          <span>本地存储</span>
          <small>梦境与录音只保存在当前浏览器</small>
        </div>
        <span class="status-dot">本机</span>
      </div>
      <div class="settings-item">
        <div>
          <span>AI 整理与生图</span>
          <small>{{ settings.aiEndpoint ? '已连接自定义服务端点' : '关闭 · 需要你主动配置服务端点' }}</small>
        </div>
        <span class="status-dot">{{ settings.aiEndpoint ? '可用' : '可选' }}</span>
      </div>
    </div>

    <section class="ai-settings glass-card" aria-labelledby="ai-settings-title">
      <header>
        <div>
          <p class="eyebrow">Private gateway</p>
          <h2 id="ai-settings-title">AI 服务地址</h2>
        </div>
      </header>
      <p>填写你信任的服务端地址。拾梦只调用其整理、转写和生图接口，不在浏览器保存 API Key。</p>
      <form @submit.prevent="saveAiEndpoint">
        <label for="ai-endpoint">HTTPS 地址</label>
        <input
          id="ai-endpoint"
          v-model="aiEndpointDraft"
          type="url"
          inputmode="url"
          autocomplete="url"
          placeholder="https://your-dream-gateway.example"
          aria-describedby="ai-endpoint-help"
        />
        <small id="ai-endpoint-help">本地开发可使用 localhost；留空保存即可关闭 AI。</small>
        <button type="submit" class="primary-button" aria-label="保存 AI 服务地址" :disabled="busy">
          保存服务地址
        </button>
      </form>
      <p v-if="aiMessage" class="settings-message" role="status">{{ aiMessage }}</p>
      <p v-if="aiError" class="settings-error" role="alert">{{ aiError }}</p>
    </section>

    <section class="device-card glass-card" aria-labelledby="device-title">
      <header>
        <div>
          <p class="eyebrow">This device</p>
          <h2 id="device-title">本机空间与体验</h2>
        </div>
        <Database :size="22" aria-hidden="true" />
      </header>
      <dl v-if="storageSummary" class="storage-grid">
        <div><dt>已使用</dt><dd>{{ formatBytes(storageSummary.usedBytes) }}</dd></div>
        <div><dt>可用配额</dt><dd>{{ formatBytes(storageSummary.quotaBytes) }}</dd></div>
        <div><dt>梦境</dt><dd>{{ storageSummary.dreamCount }}</dd></div>
        <div><dt>录音 / 图片</dt><dd>{{ storageSummary.audioCount }} / {{ storageSummary.imageCount }}</dd></div>
      </dl>
      <p class="device-note">{{ persistenceCopy }}</p>

      <label class="motion-setting">
        <span>动态效果</span>
        <select v-model="motionDraft" aria-label="动态效果设置" @change="saveMotionPreference">
          <option value="system">跟随系统</option>
          <option value="reduce">减少动态</option>
          <option value="allow">保留动态</option>
        </select>
      </label>

      <button
        v-if="install.canInstall.value"
        type="button"
        class="quiet-button"
        aria-label="安装拾梦到桌面"
        @click="install.requestInstall"
      >
        <Smartphone :size="17" aria-hidden="true" />
        安装到桌面
      </button>
      <p v-else-if="install.showIosInstructions.value" class="device-note">Safari：分享 → 添加到主屏幕</p>
    </section>

    <section class="backup-card glass-card" aria-labelledby="backup-title">
      <header>
        <div>
          <p class="eyebrow">Local backup</p>
          <h2 id="backup-title">备份与恢复</h2>
        </div>
        <ShieldCheck :size="22" aria-hidden="true" />
      </header>
      <p>完整备份会包含梦境文字、录音与 AI 图片，可保存到你选择的位置。</p>
      <small>{{ lastBackupCopy }}</small>

      <div v-if="!showExportWarning" class="backup-actions">
        <button type="button" class="primary-button" aria-label="导出完整备份" @click="showExportWarning = true">
          <Download :size="17" aria-hidden="true" />
          导出完整备份
        </button>
        <label class="quiet-button import-button">
          <Upload :size="17" aria-hidden="true" />
          选择备份恢复
          <input type="file" accept=".zip,application/zip" @change="inspectSelectedBackup" />
        </label>
      </div>

      <div v-else class="export-warning" role="alert">
        <p>备份未加密，请妥善保管。任何拿到文件的人都可能读取其中的梦境与录音。</p>
        <div>
          <button type="button" class="text-button" @click="showExportWarning = false">取消</button>
          <button
            type="button"
            class="primary-button"
            aria-label="确认导出备份"
            :disabled="busy"
            @click="exportBackup"
          >
            {{ busy ? '正在打包…' : '确认导出' }}
          </button>
        </div>
      </div>

      <p v-if="message" class="settings-message" role="status">{{ message }}</p>
      <p v-if="error" class="settings-error" role="alert">{{ error }}</p>
    </section>

    <RestorePreviewDialog
      v-if="inspection"
      :inspection="inspection"
      :busy="busy"
      @cancel="inspection = null"
      @confirm="confirmRestore"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import { Database, Download, ShieldCheck, Smartphone, Upload } from '@lucide/vue'
import type { IDBPDatabase } from 'idb'

import { openShimengDb, type ShimengDb } from '@/core/persistence/db'
import { validateAiEndpoint } from '@/features/ai/services/HttpDreamAiGateway'
import RestorePreviewDialog from '@/features/backup/components/RestorePreviewDialog.vue'
import type { BackupInspection } from '@/features/backup/model/backup'
import { createBackup, inspectBackup, restoreBackup } from '@/features/backup/services/backupService'
import { useSettingsStore } from '@/features/settings/stores/settings'
import type { ReducedMotionOverride } from '@/features/settings/model/settings'
import { useInstallPrompt } from '@/pwa/installPrompt'
import {
  estimateStorage,
  persistenceStatus,
  type StorageSummary,
} from '@/pwa/storagePersistence'

const settingsStore = useSettingsStore()
const settings = computed(() => settingsStore.settings)
const install = useInstallPrompt()
const aiEndpointDraft = ref('')
const motionDraft = ref<ReducedMotionOverride>('system')
const storageSummary = ref<StorageSummary | null>(null)
const aiMessage = ref<string | null>(null)
const aiError = ref<string | null>(null)
const inspection = shallowRef<BackupInspection | null>(null)
const showExportWarning = ref(false)
const busy = ref(false)
const message = ref<string | null>(null)
const error = ref<string | null>(null)
let database: IDBPDatabase<ShimengDb> | undefined

const lastBackupCopy = computed(() => {
  if (!settings.value.lastBackupAt) return '还没有导出过备份'
  return `上次备份：${new Date(settings.value.lastBackupAt).toLocaleString('zh-CN')}`
})
const persistenceCopy = computed(() => {
  if (persistenceStatus.value === 'granted') return '浏览器已尽力为拾梦保留本机数据。'
  if (persistenceStatus.value === 'denied') return '浏览器未授予持久存储，请定期导出备份。'
  if (persistenceStatus.value === 'unsupported') return '当前浏览器不支持持久存储请求，请定期导出备份。'
  return '数据保存在当前浏览器中；重要梦境建议定期备份。'
})

async function getDatabase() {
  database ??= await openShimengDb()
  return database
}

onMounted(async () => {
  await settingsStore.load()
  aiEndpointDraft.value = settings.value.aiEndpoint ?? ''
  motionDraft.value = settings.value.reducedMotionOverride
  try {
    storageSummary.value = await estimateStorage()
  } catch {
    storageSummary.value = null
  }
})

async function saveMotionPreference() {
  await settingsStore.update({ reducedMotionOverride: motionDraft.value })
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 MB'
  const megabytes = bytes / 1024 / 1024
  return `${megabytes < 10 ? megabytes.toFixed(1) : Math.round(megabytes)} MB`
}

async function saveAiEndpoint() {
  aiMessage.value = null
  aiError.value = null
  try {
    const candidate = aiEndpointDraft.value.trim()
    const aiEndpoint = candidate ? validateAiEndpoint(candidate) : null
    await settingsStore.update({ aiEndpoint })
    aiEndpointDraft.value = aiEndpoint ?? ''
    aiMessage.value = aiEndpoint ? 'AI 服务地址已保存' : 'AI 功能已关闭'
  } catch (cause) {
    aiError.value = cause instanceof Error ? cause.message : 'AI 服务地址保存失败'
  }
}

async function exportBackup() {
  busy.value = true
  error.value = null
  message.value = null
  try {
    const db = await getDatabase()
    const archive = await createBackup(db)
    const url = URL.createObjectURL(archive)
    const link = document.createElement('a')
    link.href = url
    link.download = `拾梦备份-${new Date().toISOString().slice(0, 10)}.zip`
    link.click()
    URL.revokeObjectURL(url)

    await settingsStore.update({ lastBackupAt: new Date().toISOString() })
    showExportWarning.value = false
    message.value = '完整备份已导出'
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '备份导出失败，请稍后再试'
  } finally {
    busy.value = false
  }
}

async function inspectSelectedBackup(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  error.value = null
  message.value = null
  try {
    inspection.value = await inspectBackup(file)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '无法读取这个备份文件'
  }
}

async function confirmRestore() {
  if (!inspection.value) return
  busy.value = true
  error.value = null
  try {
    const report = await restoreBackup(await getDatabase(), inspection.value)
    inspection.value = null
    message.value = `已恢复 ${report.imported} 个梦，跳过 ${report.skipped} 个相同记录`
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '恢复失败，本机原有内容没有被清空'
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.settings-list {
  margin-top: 2rem;
  padding: 0 1.2rem;
}

.settings-item {
  display: flex;
  min-height: 4.4rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid var(--color-line);
}

.settings-item:last-child {
  border-bottom: 0;
}

.settings-item > div {
  display: grid;
  gap: 0.3rem;
}

.settings-item span {
  font-family: var(--font-display);
}

.settings-item small {
  display: block;
  color: var(--color-ink-muted);
  font-size: 0.7rem;
  text-align: right;
}

.status-dot {
  padding: 0.3rem 0.55rem;
  border-radius: 999px;
  color: #45665d;
  background: rgb(125 163 151 / 18%);
  font-family: var(--font-body) !important;
  font-size: 0.62rem;
}

.backup-card {
  display: grid;
  gap: 0.9rem;
  margin-top: 1.2rem;
  padding: 1.2rem;
}

.ai-settings {
  display: grid;
  gap: 0.85rem;
  margin-top: 1.2rem;
  padding: 1.2rem;
}

.ai-settings h2,
.ai-settings p {
  margin: 0;
}

.ai-settings h2 {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 400;
}

.ai-settings > p:not(.settings-message, .settings-error) {
  color: var(--color-ink-muted);
  font-size: 0.72rem;
  line-height: 1.65;
}

.ai-settings form {
  display: grid;
  gap: 0.55rem;
}

.ai-settings label {
  color: var(--color-night-soft);
  font-family: var(--font-display);
  font-size: 0.76rem;
}

.ai-settings input {
  width: 100%;
  min-height: 3rem;
  padding: 0 0.85rem;
  border: 1px solid var(--color-line);
  border-radius: 0.85rem;
  color: var(--color-night);
  background: rgb(255 255 255 / 44%);
  outline: none;
}

.ai-settings input:focus {
  border-color: rgb(141 82 103 / 42%);
  box-shadow: 0 0 0 3px rgb(215 169 189 / 14%);
}

.ai-settings form small {
  color: var(--color-ink-muted);
  font-size: 0.62rem;
  line-height: 1.5;
}

.ai-settings form .primary-button {
  justify-self: start;
  margin-top: 0.25rem;
}

.device-card {
  display: grid;
  gap: 0.9rem;
  margin-top: 1.2rem;
  padding: 1.2rem;
}

.device-card > header {
  display: flex;
  align-items: start;
  justify-content: space-between;
}

.device-card h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 400;
}

.storage-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  margin: 0;
  border: 1px solid var(--color-line);
  border-radius: 0.9rem;
  overflow: hidden;
}

.storage-grid div {
  display: grid;
  gap: 0.2rem;
  padding: 0.7rem;
}

.storage-grid div:nth-child(even) {
  border-left: 1px solid var(--color-line);
}

.storage-grid div:nth-child(n + 3) {
  border-top: 1px solid var(--color-line);
}

.storage-grid dt {
  color: var(--color-ink-muted);
  font-size: 0.58rem;
}

.storage-grid dd {
  margin: 0;
  font-family: var(--font-display);
  font-size: 0.82rem;
}

.device-note {
  margin: 0;
  color: var(--color-ink-muted);
  font-size: 0.64rem;
  line-height: 1.55;
}

.motion-setting {
  display: flex;
  min-height: 3rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-top: 1px solid var(--color-line);
  border-bottom: 1px solid var(--color-line);
  font-family: var(--font-display);
  font-size: 0.78rem;
}

.motion-setting select {
  padding: 0.45rem;
  border: 1px solid var(--color-line);
  border-radius: 0.65rem;
  color: var(--color-night-soft);
  background: rgb(255 255 255 / 42%);
}

.device-card > .quiet-button {
  justify-self: start;
}

.backup-card > header {
  display: flex;
  align-items: start;
  justify-content: space-between;
}

.backup-card h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 400;
}

.backup-card > p,
.backup-card > small {
  margin: 0;
  color: var(--color-ink-muted);
  font-size: 0.72rem;
  line-height: 1.65;
}

.backup-card > small {
  font-size: 0.64rem;
}

.backup-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.import-button {
  position: relative;
  cursor: pointer;
  overflow: hidden;
}

.import-button input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.export-warning {
  padding: 0.9rem;
  border-radius: 1rem;
  background: rgb(215 169 189 / 25%);
}

.export-warning p {
  margin: 0;
  color: #713b49;
  font-size: 0.7rem;
  line-height: 1.6;
}

.export-warning > div {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.7rem;
}

.text-button {
  padding: 0.6rem;
  border: 0;
  background: transparent;
}

.settings-message,
.settings-error {
  padding: 0.65rem 0.8rem;
  border-radius: 0.8rem;
}

.settings-message {
  color: #45665d !important;
  background: rgb(125 163 151 / 16%);
}

.settings-error {
  color: #713b49 !important;
  background: rgb(215 169 189 / 25%);
}
</style>
