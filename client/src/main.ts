// global var defined through vite's configruation file
declare global {
  const SW_DEV: boolean
}


import { theme } from './assignThemeSync.js'
import { runBrowser } from '@aelea/dom'
import { $Main } from './pages/$Main.js'
import { $MainGmxHouse } from './pages/$Main-gmx.house'

console.log(theme)

runBrowser()(
  $MainGmxHouse({})({})
)
