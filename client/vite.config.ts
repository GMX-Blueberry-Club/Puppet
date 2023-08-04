import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({

  define: {
    // global: "globalThis",
  },
  
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