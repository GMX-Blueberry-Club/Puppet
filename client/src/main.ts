import { theme } from './assignThemeSync'
import { runBrowser } from '@aelea/dom'
import { $Main } from './pages/$Main'

console.log(theme)

runBrowser()(
  $Main({})({})
)
