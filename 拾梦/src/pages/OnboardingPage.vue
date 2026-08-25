<template>
  <section class="onboarding-page">
    <div class="onboarding-page__moon" aria-hidden="true" />
    <p class="eyebrow">Welcome to 拾梦</p>
    <h1 class="page-heading">有些梦，<br />值得在醒来后继续发光。</h1>
    <p class="page-intro">拾梦会把文字、录音和画面保存在你的设备里。没有账号，也不会替你解读梦的意义。</p>

    <ul class="privacy-promises">
      <li>
        <HardDrive :size="18" aria-hidden="true" />
        <span><strong>只存在本机</strong><small>换设备或清除浏览器数据前，请先导出备份。</small></span>
      </li>
      <li>
        <ShieldCheck :size="18" aria-hidden="true" />
        <span><strong>AI 默认关闭</strong><small>只有你主动配置并逐次确认，内容才会发送。</small></span>
      </li>
    </ul>

    <button
      v-if="install.canInstall.value"
      type="button"
      class="quiet-button"
      aria-label="安装拾梦到桌面"
      @click="install.requestInstall"
    >
      <Download :size="17" aria-hidden="true" />
      安装到桌面
    </button>
    <p v-else-if="install.showIosInstructions.value" class="ios-install">在 Safari 中轻触“分享 → 添加到主屏幕”，就能像 App 一样打开。</p>

    <p v-if="error" class="onboarding-error" role="alert">{{ error }}</p>
    <button
      type="button"
      class="primary-button"
      aria-label="完成首次设置"
      :disabled="busy"
      @click="completeOnboarding"
    >
      {{ busy ? '正在准备本地空间…' : '开始拾梦' }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { Download, HardDrive, ShieldCheck } from '@lucide/vue'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { useSettingsStore } from '@/features/settings/stores/settings'
import { useInstallPrompt } from '@/pwa/installPrompt'
import { requestPersistentStorage } from '@/pwa/storagePersistence'

const router = useRouter()
const settings = useSettingsStore()
const install = useInstallPrompt()
const busy = ref(false)
const error = ref<string | null>(null)

async function completeOnboarding() {
  busy.value = true
  error.value = null
  try {
    void requestPersistentStorage().catch(() => undefined)
    await settings.update({ onboardingCompleted: true })
    await router.push('/home')
  } catch {
    error.value = '本地设置暂时无法保存，请检查浏览器存储空间。'
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.onboarding-page {
  display: grid;
  min-height: 64dvh;
  align-content: center;
  justify-items: start;
  padding-bottom: 2rem;
}

.onboarding-page__moon {
  width: 7rem;
  aspect-ratio: 1;
  margin-bottom: 2.4rem;
  border-radius: 50%;
  background:
    radial-gradient(circle at 38% 31%, white 0 4%, transparent 5%),
    linear-gradient(145deg, var(--color-moon), #dcc8d2 60%, #8b91aa);
  box-shadow: 0 0 4rem 1.6rem rgb(255 248 232 / 66%);
}

.privacy-promises {
  display: grid;
  gap: 0.65rem;
  width: 100%;
  margin: 1.5rem 0 0;
  padding: 0;
  list-style: none;
}

.privacy-promises li {
  display: flex;
  align-items: start;
  gap: 0.75rem;
  padding: 0.9rem;
  border: 1px solid var(--color-line);
  border-radius: 1rem;
  color: #70566a;
  background: rgb(255 255 255 / 32%);
}

.privacy-promises span {
  display: grid;
  gap: 0.2rem;
}

.privacy-promises strong {
  color: var(--color-night-soft);
  font-family: var(--font-display);
  font-size: 0.82rem;
  font-weight: 400;
}

.privacy-promises small,
.ios-install {
  color: var(--color-ink-muted);
  font-size: 0.64rem;
  line-height: 1.55;
}

.onboarding-page > .quiet-button {
  margin-top: 1rem;
}

.ios-install {
  margin: 1rem 0 0;
  padding: 0.7rem 0.8rem;
  border-radius: 0.8rem;
  background: rgb(255 255 255 / 32%);
}

.onboarding-error {
  margin: 1rem 0 0;
  color: #713b49;
  font-size: 0.7rem;
}

.onboarding-page .primary-button {
  margin-top: 1.25rem;
}
</style>
