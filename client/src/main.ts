
import { theme } from './assignThemeSync.js'
import { runBrowser } from '@aelea/dom'
import { $Main } from './pages/$Main.js'

console.log(theme)

runBrowser()(
  $Main({})({})
)
