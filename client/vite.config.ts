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
  // selfDestroying: Boolean(process.env.SW_DESTROY),
  registerType: 'autoUpdate',
  strategies: 'injectManifest',
  injectManifest: {
    maximumFileSizeToCacheInBytes: 15000000,
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
    lang:"en",
    start_url: '/app/leaderboard/settled',
    display:"standalone",
    orientation: "any",
    categories:[ "Copy Trading", "Decentralized Perpetual Exchange", "DeFi" ],

    // screenshots: [
    //   {
    //     src: "video/trade-adjust.mp4",
    //     sizes: "640x320",
    //     type: "video/mp4",
    //     form_factor: "wide",
    //     label: "Wonder Widgets"
    //   },
    //   {
    //     src: "video/trade-adjust.mp4",
    //     sizes: "750x1334",
    //     type: "video/mp4",
    //     form_factor: "narrow",
    //     label: "Wonder Widgets"
    //   }
    // ],
    // share_target: { 
    //   action:"/?utm_medium=PWA&utm_source=share-target&share-target",
    //   method:"POST",
    //   enctype:"multipart/form-data", params:{ files:[{ name:"file", accept:["image/*"] }] }
    // },
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
}


// https://vitejs.dev/config/
export default defineConfig({
  define: { 
    ...prefixedParentEnv
  },
  envDir: '../',
  publicDir: 'assets',
  plugins: [
    VitePWA(pwaOptions),
    replace({
      include: 'index.html',
      __DATE__: new Date().toISOString(),
      SW_DEV: process.env.DEV,
      ...SITE_CONFIG
    }) as any,
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