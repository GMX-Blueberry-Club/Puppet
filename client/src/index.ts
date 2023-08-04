
// import 'construct-style-sheets-polyfill'
export * from './assignThemeSync' // apply synchnously theme before all styles are being evaluated
import { runBrowser } from '@aelea/dom'
import { $Main } from './pages/$Main'


runBrowser()(
  $Main({})({})
)
