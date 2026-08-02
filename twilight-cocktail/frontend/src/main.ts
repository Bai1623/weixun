import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import { normalizeHashUrl } from './router/normalizeHashUrl'
import { registerServiceWorker } from './registerServiceWorker'
import router from './router'
import './styles/main.css'

normalizeHashUrl()
createApp(App).use(createPinia()).use(router).mount('#app')
registerServiceWorker()
