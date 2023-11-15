// global var defined through vite's configruation file
declare global {
  const SW_DEV: boolean
}

import { runBrowser } from '@aelea/dom'
import { $Main } from './pages/$Main.js'


runBrowser()(
  $Main({})({})
)
