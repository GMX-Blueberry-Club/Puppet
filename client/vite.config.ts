import { defineConfig } from 'vite'
import dotenv from 'dotenv'
import path from 'path'

let parentDotenvConfig

// In local environment, __dirname is a valid node variable. 
// In cloud context like Netlify, it's not available so we catch the error
try {
  const parentDotenvPath = path.join(__dirname, '../', '.env')
  parentDotenvConfig = dotenv.config({ path: parentDotenvPath })
} catch(err) {
  parentDotenvConfig = { parsed: process.env }
}

// `.env` file not found or error while reading
if (parentDotenvConfig.parsed === undefined) {
  throw new Error(`Failed to load parent .env file`)
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