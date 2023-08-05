import { theme } from './assignThemeSync' // apply synchnously theme before all styles are being evaluated
import { registerSW } from 'virtual:pwa-register'

console.log(theme)

import { runBrowser } from '@aelea/dom'
import { $Main } from './pages/$Main'


const updateSW = registerSW({
  onNeedRefresh() {
    window.prompt('wakwakka')
  },
  onOfflineReady() {},
})

runBrowser()(
  $Main({})({})
)
