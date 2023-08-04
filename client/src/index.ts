
// import 'construct-style-sheets-polyfill'
export * as ww from './assignThemeSync' // apply synchnously theme before all styles are being evaluated

console.log(ww)


import { runBrowser } from '@aelea/dom'
import { $Main } from './pages/$Main'


runBrowser()(
  $Main({})({})
)
