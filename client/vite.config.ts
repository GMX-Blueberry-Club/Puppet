import { defineConfig } from 'vite'
import { ManifestOptions, VitePWA, VitePWAOptions } from 'vite-plugin-pwa'
import replace from '@rollup/plugin-replace'

import { dark } from './src/common/theme.js'


const SITE_CONFIG = {
  WEBSITE:  'https://puppet.house',
  TWITTER_HASH:  'PuppetFinance',
  APP_NAME:  'Puppet',
  APP_DESC_SHORT:  'Copy Trading',
  APP_DESC_LONG:  'Copy Trading Protocol - Matching the best traders with investors',
  THEME_PRIMARY:  dark.pallete.primary,
  THEME_BACKGROUND:  dark.pallete.background,
}

const prefixedParentEnv = Object.fromEntries(
  Object.entries(SITE_CONFIG).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)])
)


const pwaOptions: Partial<VitePWAOptions> = {
  workbox: {
    cleanupOutdatedCaches: false
  },
  registerType: 'autoUpdate',
  strategies: 'injectManifest',
  injectManifest: {
    maximumFileSizeToCacheInBytes: 3000000,
    globPatterns: ['**/*.{js,html,woff2}']
  },
  srcDir: 'src',
  filename: 'sw.ts',
  includeAssets: ['font/*.ttf', './*.png', './*.svg'],
  manifest: {
    name: SITE_CONFIG.APP_NAME,
    short_name: SITE_CONFIG.APP_NAME,
    description: SITE_CONFIG.APP_DESC_LONG,
    theme_color: SITE_CONFIG.THEME_BACKGROUND,
    background_color: SITE_CONFIG.THEME_BACKGROUND,
    start_url: '/app/leaderboard/settled',
    icons: [
      {
        src: 'pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: 'pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png'
      },
    ]
  },

  mode: 'development',
  base: '/',
  devOptions: {
    // enabled: true,
    enabled: process.env.SW_DEV === 'true',
    /* when using generateSW the PWA plugin will switch to classic */
    type: 'module',
    navigateFallback: 'index.html',
    suppressWarnings: true,
  },
}


const replaceOptions = process.env.SW_DEV ? { __DATE__: new Date().toISOString(), SW_DEV: process.env.SW_DEV } : { __DATE__: new Date().toISOString(), SW_DEV: process.env.SW_DEV, ...SITE_CONFIG}
const selfDestroying = process.env.SW_DESTROY === 'true'

if (selfDestroying)
  pwaOptions.selfDestroying = selfDestroying


// https://vitejs.dev/config/
export default defineConfig({
  define: { ...prefixedParentEnv },
  envDir: '../',
  publicDir: 'assets',
  plugins: [
    VitePWA(pwaOptions),
    replace(replaceOptions),
  ],
  build: {
    outDir: ".dist",
    target: "es2022",
  },
  resolve: {
    alias: {
      events: 'eventemitter3',
    }
  }
})