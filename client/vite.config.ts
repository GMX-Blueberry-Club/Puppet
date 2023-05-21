import { defineConfig } from 'vite'
import dotenv from 'dotenv'
import path from 'path'

const parentDotenvPath = path.join(__dirname, '../', '.env')
const parentDotenvConfig = dotenv.config({ path: parentDotenvPath })

if (parentDotenvConfig.parsed === undefined) {
  throw new Error(`Failed to load parent .env file at ${parentDotenvPath}`)
}

const prefixedParentEnv = Object.fromEntries(
  Object.entries(parentDotenvConfig.parsed).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)])
)

// https://vitejs.dev/config/
export default defineConfig({

  define: {
    ...prefixedParentEnv,
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