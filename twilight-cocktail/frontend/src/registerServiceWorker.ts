import { registerSW } from 'virtual:pwa-register'

export const registerServiceWorker = () => {
  if (!import.meta.env.PROD) return

  const updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh() {
      void updateServiceWorker(true)
    },
  })
}
