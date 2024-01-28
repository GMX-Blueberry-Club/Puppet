
import { runBrowser } from '@aelea/dom'
import { Buffer } from 'buffer'
import { theme } from './assignThemeSync.js'
import { $Main } from './pages/$Main.js'
globalThis.Buffer = Buffer
// @ts-ignore
globalThis.theme = theme


runBrowser()(
  $Main({})({})
)
