
import { theme } from './assignThemeSync.js'
import { $text, runBrowser } from '@aelea/dom'
import { $Main } from './pages/$Main.js'
import { Buffer } from 'buffer'
import { walletLink } from './wallet'
import { $column } from '@aelea/ui-components'
import { awaitPromises, map } from '@most/core'
import { $IntermediateConnectButton } from './components/$ConnectAccount'
import { disconnect, reconnect, watchAccount } from '@wagmi/core'
import { $ButtonSecondary } from './components/form/$Button'
import { wagmiConfig } from './wallet/walletLink'
globalThis.Buffer = Buffer
// @ts-ignore
globalThis.theme = theme


const status = map(res => String(JSON.stringify(res)), walletLink.wallet)

watchAccount(wagmiConfig, {
  onChange(res) {
    console.log('accountChange', res)
    // return cb(res)
  }
})

const reconnectQuery = reconnect(wagmiConfig)
  .then(() => {
    // return getWalletClient(wagmiConfig)
  })
  .catch(e => {
    console.error(e)
    return null
  })

runBrowser()(
  $Main({})({})
)
