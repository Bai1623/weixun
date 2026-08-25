import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHashHistory } from 'vue-router'

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

export default createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
})
