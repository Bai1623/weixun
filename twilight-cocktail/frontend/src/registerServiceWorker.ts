import { registerSW } from 'virtual:pwa-register'

export const clearLegacyPwaCaches = async () => {
  const registrations = await window.navigator.serviceWorker?.getRegistrations?.()
  await Promise.all(registrations?.map((registration) => registration.unregister()) ?? [])

  if (!('caches' in window)) return
  const cacheNames = await window.caches.keys()
  await Promise.all(cacheNames.map((cacheName) => window.caches.delete(cacheName)))
}

export const registerServiceWorker = () => {
  if (!import.meta.env.PROD) return

  void clearLegacyPwaCaches()
  const updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh() {
      void updateServiceWorker(true)
    },
  })
}
