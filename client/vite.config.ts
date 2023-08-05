import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { dark } from './src/common/theme'


const SITE_CONFIG = {
  URL:  'puppet.house',
  TWITTER_HASH:  'PuppetFinance',
  APP_NAME:  'Puppet',
  APP_DESC_SHORT:  'Mirror Trading',
  APP_DESC_LONG:  'Traders earn more, investors minimize their risks by mirroring multiple performant traders on a single deposit.',
  THEME_PRIMARY:  dark.pallete.primary,
  THEME_BACKGROUND:  dark.pallete.background,
}

const prefixedParentEnv = Object.fromEntries(
  Object.entries(SITE_CONFIG).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)])
)

// https://vitejs.dev/config/
export default defineConfig({
  define: { ...prefixedParentEnv },
  publicDir: 'assets',
  plugins: [
    VitePWA({
      registerType: 'prompt',
      devOptions: {
        enabled: true
        /* other options */
      },

      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',

      includeAssets: ['pwa-192x192.png', 'pwa-512x512.png', 'metamask-fox.svg'],
      manifest: {
        name: SITE_CONFIG.APP_NAME,
        short_name: SITE_CONFIG.APP_NAME,
        description: SITE_CONFIG.APP_DESC_LONG,
        theme_color: SITE_CONFIG.THEME_PRIMARY,
        background_color: SITE_CONFIG.THEME_BACKGROUND,
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
          }
        ]
      }
    })
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