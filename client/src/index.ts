import { theme } from './assignThemeSync' // apply synchnously theme before all styles are being evaluated

console.log(theme)


import { runBrowser } from '@aelea/dom'
import { $Main } from './pages/$Main'


runBrowser()(
  $Main({})({})
)
