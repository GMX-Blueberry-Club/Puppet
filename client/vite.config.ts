import replace from '@rollup/plugin-replace'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { dark } from './src/common/theme.js'


const SITE_CONFIG = {
  __WEBSITE__:  'https://puppet.house',
  __TWITTER_ID__:  '@PuppetCopy',
  __APP_NAME__:  'Puppet',
  __APP_DESC_SHORT__:  'Puppet - Copy Trading',
  __APP_DESC_LONG__:  'Copy Trading Protocol - Matching the best traders with investors',
  __OG_IMAGE__:  '/.netlify/functions/og-middlware',
  __THEME_PRIMARY__:  dark.pallete.primary,
  __THEME_BACKGROUND__:  dark.pallete.horizon,
}

const vitePlugin = VitePWA({
  // workbox: {
  //   cleanupOutdatedCaches: true
  // },
  outDir: '.dist',
  registerType: 'autoUpdate',
  strategies: 'injectManifest',
  injectManifest: {
    maximumFileSizeToCacheInBytes: 15000000,
    globPatterns: ['**/*.{js,html,woff2}']
  },
  injectRegister: 'auto',
  srcDir: 'src',
  filename: 'sw.ts',
  includeAssets: ['font/*.ttf', './*.png', './*.svg'],
  manifest: {
    name: SITE_CONFIG.__APP_NAME__,
    short_name: SITE_CONFIG.__APP_NAME__,
    description: SITE_CONFIG.__APP_DESC_LONG__,
    theme_color: SITE_CONFIG.__THEME_BACKGROUND__,
    background_color: SITE_CONFIG.__THEME_BACKGROUND__,
    lang:"en",
    start_url: '/app/leaderboard',
    display:"standalone",
    orientation: "any",
    categories:[ "Copy Trading", "Decentralized Perpetual Exchange", "DeFi" ],
    screenshots:[
      { src:"/screenshot/narrow1.png", type:"image/png", sizes:"828x1792", form_factor:"narrow" },
      { src:"/screenshot/narrow2.png", type:"image/png", sizes:"828x1792", form_factor:"narrow" },

      { src:"/screenshot/wide1.png", type:"image/png", sizes:"3260x1692", form_factor:"wide" },
      { src:"/screenshot/wide2.png", type:"image/png", sizes:"3260x1692", form_factor:"wide" }
    ],
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
    // navigateFallbackAllowlist: [/^index.html$/],
    // enabled: true,
    enabled: Boolean(process.env.SW_DEV),
    /* when using generateSW the PWA plugin will switch to classic */
    type: 'module',
    navigateFallback: 'index.html',
    suppressWarnings: true,
  },
})


const replaceExec = replace({
  include: 'index.html',
  ...SITE_CONFIG
})
// https://vitejs.dev/config/
export default defineConfig({
  envDir: '../',
  publicDir: 'assets',
  plugins: [
    vitePlugin,
    replaceExec,
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