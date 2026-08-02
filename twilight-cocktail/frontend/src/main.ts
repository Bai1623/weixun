import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import { registerServiceWorker } from './registerServiceWorker'
import router from './router'
import './styles/main.css'

createApp(App).use(createPinia()).use(router).mount('#app')
registerServiceWorker()
