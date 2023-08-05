import { theme } from './assignThemeSync' // apply synchnously theme before all styles are being evaluated
import { registerSW } from 'virtual:pwa-register'
// import Wroker from './workers/background?worker'


// replaced dyanmicaly
const reloadSW = '__RELOAD_SW__'

const reload = registerSW({
  async onNeedRefresh() {
    const res = window.prompt('new update is pending, respond with "X" to reload')

    if (res === 'X') {
      await reload(true)
      console.log('Done reloading')
    }

    // if (reloadSW === 'true') {
    //   setInterval(async () => {
    //   }, 20000 /* 20s for testing purposes */)
    // }
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
