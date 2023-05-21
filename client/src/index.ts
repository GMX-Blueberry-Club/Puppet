


import 'construct-style-sheets-polyfill'
import './assignThemeSync' // apply synchnously theme before all styles are being evaluated

import { $Main } from './pages/$Main'
import { runBrowser } from '@aelea/dom'


// animate()

runBrowser()(
  $Main({})({})
)
