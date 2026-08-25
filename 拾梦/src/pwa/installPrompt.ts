import { computed, getCurrentInstance, onBeforeUnmount, ref, type Ref } from 'vue'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export interface InstallPromptController {
  canInstall: Ref<boolean>
  showIosInstructions: Readonly<Ref<boolean>>
  requestInstall(): Promise<boolean>
  dispose(): void
}

export function useInstallPrompt(
  target: Window = window,
  userAgent = navigator.userAgent,
): InstallPromptController {
  const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
  const canInstall = computed(() => deferredPrompt.value !== null)
  const isIos = /iPad|iPhone|iPod/i.test(userAgent)
  const standalone =
    target.matchMedia?.('(display-mode: standalone)').matches ||
    Boolean((target.navigator as Navigator & { standalone?: boolean }).standalone)
  const showIosInstructions = computed(() => isIos && !standalone && !canInstall.value)

  function capture(event: Event) {
    event.preventDefault()
    deferredPrompt.value = event as BeforeInstallPromptEvent
  }

  target.addEventListener('beforeinstallprompt', capture)

  async function requestInstall(): Promise<boolean> {
    const prompt = deferredPrompt.value
    if (!prompt) return false
    await prompt.prompt()
    const choice = await prompt.userChoice
    if (choice.outcome === 'accepted') deferredPrompt.value = null
    return choice.outcome === 'accepted'
  }

  function dispose() {
    target.removeEventListener('beforeinstallprompt', capture)
  }

  if (getCurrentInstance()) onBeforeUnmount(dispose)

  return { canInstall, showIosInstructions, requestInstall, dispose }
}
