
import { runBrowser } from '@aelea/dom'
import { Buffer } from 'buffer'
import { theme } from './assignThemeSync.js'
import { $Main } from './pages/$Main.js'
import { walletLink } from './wallet'
import { newDefaultScheduler } from '@most/scheduler'
import { nullSink } from '@aelea/core'
import { reconnect } from '@wagmi/core'
globalThis.Buffer = Buffer
// @ts-ignore
globalThis.theme = theme




// walletLink.wallet.run({
//   ...nullSink,
//   event(time, value) {
//     console.log(time, value)
//   },
// }, newDefaultScheduler())

runBrowser()(
  $Main({})({})
)
