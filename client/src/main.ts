// global var defined through vite's configruation file
declare global {
  const SW_DEV: boolean
}


import { theme } from './assignThemeSync'
import { runBrowser } from '@aelea/dom'
import { $Main } from './pages/$Main'

console.log(theme)

runBrowser()(
  $Main({})({})
)
