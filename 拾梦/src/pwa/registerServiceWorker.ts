import { ref, type Ref } from 'vue'
import { registerSW } from 'virtual:pwa-register'

export interface RegistrationOptions {
  immediate?: boolean
  onNeedRefresh?: () => void
  onOfflineReady?: () => void
  onRegisterError?: (error: unknown) => void
}

type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>
type Register = (options?: RegistrationOptions) => UpdateServiceWorker

export interface UpdateController {
  needRefresh: Ref<boolean>
  offlineReady: Ref<boolean>
  error: Ref<string | null>
  acceptUpdate(): Promise<boolean>
  dismissUpdate(): void
}

export function registerServiceWorker(
  canReload: () => boolean,
  register: Register = registerSW as Register,
  enabled = import.meta.env.PROD,
): UpdateController {
  const needRefresh = ref(false)
  const offlineReady = ref(false)
  const error = ref<string | null>(null)
  let updateServiceWorker: UpdateServiceWorker | undefined

  if (enabled) {
    updateServiceWorker = register({
      immediate: true,
      onNeedRefresh: () => {
        needRefresh.value = true
      },
      onOfflineReady: () => {
        offlineReady.value = true
      },
      onRegisterError: () => {
        error.value = '离线服务暂时不可用，不影响本机记录'
      },
    })
  }

  async function acceptUpdate(): Promise<boolean> {
    if (!updateServiceWorker || !canReload()) return false
    await updateServiceWorker(true)
    return true
  }

  function dismissUpdate() {
    needRefresh.value = false
  }

  return { needRefresh, offlineReady, error, acceptUpdate, dismissUpdate }
}
