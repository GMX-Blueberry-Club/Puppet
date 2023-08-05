import { theme } from './assignThemeSync' // apply synchnously theme before all styles are being evaluated
import { registerSW } from 'virtual:pwa-register'
// import Wroker from './workers/background?worker'


// replaced dyanmicaly
const reloadSW: any = '__RELOAD_SW__'

const register = registerSW({
  onNeedRefresh() {
    if (reloadSW === 'true') {
      setInterval(async () => {
        console.log('Checking for sw update')
        await register(true)
      }, 20000 /* 20s for testing purposes */)
    }
  },
  immediate: true,
  onRegisteredSW(swUrl, r) {
    // eslint-disable-next-line no-console
    console.log(`Service Worker at: ${swUrl}`)
 
  },
})

// const worker = new Wroker()

console.log(theme)

import { runBrowser } from '@aelea/dom'
import { $Main } from './pages/$Main'


const date = '__DATE__'

// worker.addEventListener('message', async (msg) => {
  
// })

console.log(date)

const updateSW = registerSW({
  onNeedRefresh() {
    window.prompt('wakwakka')
  },
  onOfflineReady() {},
})

runBrowser()(
  $Main({})({})
)
