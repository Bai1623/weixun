<template>
  <div class="app-shell">
    <div class="ambient-light ambient-light--moon" aria-hidden="true" />
    <div class="ambient-light ambient-light--blush" aria-hidden="true" />

    <aside v-if="needRefresh" class="update-notice" role="status">
      <span>{{ updateBlocked ? '请先等待草稿或录音保存完成' : '拾梦有一份新版本' }}</span>
      <div>
        <button type="button" class="text-button" @click="dismissUpdate">稍后</button>
        <button type="button" class="primary-button" aria-label="安全更新拾梦" @click="applyUpdate">更新</button>
      </div>
    </aside>

    <header class="app-header">
      <RouterLink class="brand" to="/home" data-testid="brand" aria-label="拾梦首页">
        <span class="brand__moon" aria-hidden="true" />
        <span>拾梦</span>
      </RouterLink>
      <p class="app-header__whisper">把醒来前的微光，轻轻留下</p>
    </header>

    <main class="app-main">
      <RouterView v-slot="{ Component, route }">
        <Transition name="page" mode="out-in">
          <component :is="Component" :key="route.fullPath" />
        </Transition>
      </RouterView>
    </main>

    <nav class="primary-nav" data-testid="primary-nav" aria-label="主要导航">
      <RouterLink v-for="item in navItems" :key="item.to" :to="item.to" class="primary-nav__item">
        <component :is="item.icon" :size="21" :stroke-width="1.65" aria-hidden="true" />
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { Archive, House, PenLine, Settings } from '@lucide/vue'
import { ref } from 'vue'

import { canReloadSafely } from '@/pwa/reloadSafety'
import { registerServiceWorker } from '@/pwa/registerServiceWorker'

const { needRefresh, acceptUpdate, dismissUpdate } = registerServiceWorker(canReloadSafely)
const updateBlocked = ref(false)

async function applyUpdate() {
  updateBlocked.value = !(await acceptUpdate())
}

const navItems = [
  { label: '梦河', to: '/home', icon: House },
  { label: '记录', to: '/record', icon: PenLine },
  { label: '档案', to: '/archive', icon: Archive },
  { label: '设置', to: '/settings', icon: Settings },
]
</script>

<style scoped>
.app-shell {
  position: relative;
  min-height: 100dvh;
  overflow: hidden;
  isolation: isolate;
}

.app-shell::before {
  position: fixed;
  inset: 0;
  z-index: -3;
  background:
    linear-gradient(180deg, rgb(255 255 255 / 52%), transparent 34%),
    linear-gradient(145deg, var(--color-mist) 0%, #e8e7ee 52%, #e1dfe7 100%);
  content: '';
}

.app-shell::after {
  position: fixed;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  opacity: 0.12;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.23'/%3E%3C/svg%3E");
  content: '';
}

.update-notice {
  position: fixed;
  z-index: 8;
  top: calc(0.75rem + env(safe-area-inset-top, 0px));
  right: 0.75rem;
  left: 0.75rem;
  display: flex;
  width: min(calc(100% - 1.5rem), 30rem);
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
  margin: auto;
  padding: 0.65rem 0.7rem 0.65rem 0.9rem;
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 1rem;
  color: white;
  background: rgb(21 24 39 / 92%);
  box-shadow: var(--shadow-soft);
  font-size: 0.68rem;
}

.update-notice > div {
  display: flex;
  gap: 0.25rem;
}

.update-notice .text-button {
  border: 0;
  color: rgb(255 255 255 / 72%);
  background: transparent;
}

.update-notice .primary-button {
  min-height: 2.3rem;
  padding: 0.45rem 0.75rem;
}

.ambient-light {
  position: fixed;
  z-index: -2;
  width: 19rem;
  aspect-ratio: 1;
  border-radius: 999px;
  filter: blur(72px);
  pointer-events: none;
}

.ambient-light--moon {
  top: -8rem;
  right: -7rem;
  background: rgb(255 248 232 / 88%);
}

.ambient-light--blush {
  bottom: 6rem;
  left: -11rem;
  background: rgb(215 169 189 / 44%);
}

.app-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  width: min(100% - 2rem, 45rem);
  min-height: calc(4.75rem + env(safe-area-inset-top, 0px));
  margin: 0 auto;
  padding-top: env(safe-area-inset-top, 0px);
}

.brand {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: 0.55rem;
  color: var(--color-night);
  font-family: var(--font-display);
  font-size: 1.3rem;
  letter-spacing: 0.12em;
  text-decoration: none;
}

.brand__moon {
  position: relative;
  width: 1.3rem;
  height: 1.3rem;
  border-radius: 50%;
  background: var(--color-night);
  box-shadow: 0 0 22px rgb(255 248 232 / 76%);
}

.brand__moon::after {
  position: absolute;
  inset: -0.12rem -0.14rem 0.3rem 0.33rem;
  border-radius: inherit;
  background: #efedf1;
  content: '';
}

.app-header__whisper {
  display: none;
  margin: 0 0 0.85rem;
  color: var(--color-ink-muted);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
}

.app-main {
  width: min(100% - 2rem, 45rem);
  min-height: calc(100dvh - 10.75rem - var(--safe-bottom));
  margin: 0 auto;
  padding: 0.75rem 0 calc(6.75rem + var(--safe-bottom));
}

.primary-nav {
  position: fixed;
  z-index: 3;
  right: 0.75rem;
  bottom: calc(0.75rem + var(--safe-bottom));
  left: 0.75rem;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  max-width: 28rem;
  margin: auto;
  padding: 0.42rem;
  border: 1px solid rgb(255 255 255 / 52%);
  border-radius: 1.45rem;
  background: rgb(244 242 246 / 76%);
  box-shadow: 0 1rem 3rem rgb(38 38 58 / 14%);
  backdrop-filter: blur(22px) saturate(125%);
}

.primary-nav__item {
  display: flex;
  min-height: 3.5rem;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 0.22rem;
  border-radius: 1.05rem;
  color: var(--color-ink-muted);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-decoration: none;
  transition: color 180ms ease, background-color 180ms ease, transform 180ms ease;
}

.primary-nav__item.router-link-active {
  color: var(--color-night);
  background: rgb(255 255 255 / 52%);
}

.primary-nav__item:active {
  transform: scale(0.97);
}

.page-enter-active,
.page-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}

.page-enter-from,
.page-leave-to {
  opacity: 0;
  transform: translateY(5px);
}

@media (min-width: 42rem) {
  .app-header__whisper {
    display: block;
  }
}

@media (prefers-reduced-motion: reduce) {
  :global(html:not([data-motion='allow'])) .primary-nav__item,
  :global(html:not([data-motion='allow'])) .page-enter-active,
  :global(html:not([data-motion='allow'])) .page-leave-active {
    transition: none;
  }
}

:global(html[data-motion='reduce']) .primary-nav__item,
:global(html[data-motion='reduce']) .page-enter-active,
:global(html[data-motion='reduce']) .page-leave-active {
  transition: none;
}
</style>
