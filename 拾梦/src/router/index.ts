import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHashHistory } from 'vue-router'

import { useSettingsStore } from '@/features/settings/stores/settings'

export const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/home' },
  {
    path: '/onboarding',
    name: 'onboarding',
    component: () => import('../pages/OnboardingPage.vue'),
  },
  {
    path: '/home',
    name: 'home',
    component: () => import('../pages/HomePage.vue'),
  },
  {
    path: '/record/:id?',
    name: 'record',
    component: () => import('../pages/RecordPage.vue'),
  },
  {
    path: '/dream/:id',
    name: 'dream-detail',
    component: () => import('../pages/DreamDetailPage.vue'),
  },
  {
    path: '/archive',
    name: 'archive',
    component: () => import('../pages/ArchivePage.vue'),
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../pages/SettingsPage.vue'),
  },
  { path: '/:pathMatch(.*)*', redirect: '/home' },
]

export function resolveOnboardingNavigation(routeName: unknown, onboardingCompleted: boolean) {
  if (!onboardingCompleted && routeName !== 'onboarding') return { name: 'onboarding' }
  if (onboardingCompleted && routeName === 'onboarding') return { name: 'home' }
  return undefined
}

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(async (to) => {
  const settings = useSettingsStore()
  if (!settings.loaded) await settings.load()
  return resolveOnboardingNavigation(to.name, settings.settings.onboardingCompleted)
})

export default router
