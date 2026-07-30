import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHashHistory } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/home' },
  { path: '/home', component: () => import('@/pages/HomePage.vue') },
  { path: '/daily', component: () => import('@/pages/DailyPage.vue') },
  { path: '/daily/result', component: () => import('@/pages/DailyResultPage.vue') },
  { path: '/cocktails', component: () => import('@/pages/CocktailListPage.vue') },
  { path: '/cocktails/:slug', component: () => import('@/pages/CocktailDetailPage.vue') },
  { path: '/cocktails/:slug/make', component: () => import('@/pages/MakeModePage.vue') },
  { path: '/academy', component: () => import('@/pages/AcademyPage.vue') },
  { path: '/pantry', component: () => import('@/pages/PantryPage.vue') },
  { path: '/works', component: () => import('@/pages/WorksPage.vue') },
  { path: '/profile', component: () => import('@/pages/ProfilePage.vue') },
]

export default createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})
