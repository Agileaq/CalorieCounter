import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'

function gitSha(): string {
  try { return execSync('git rev-parse --short HEAD').toString().trim() } catch { return 'dev' }
}

export default defineConfig({
  base: '/CalorieCounter/',
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
    __GIT_SHA__: JSON.stringify(process.env.GIT_SHA ?? gitSha()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/icon-dark.svg'],
      manifest: {
        name: 'Calorie Counter',
        short_name: 'Calories',
        start_url: '/CalorieCounter/',
        scope: '/CalorieCounter/',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#d2691e',
        icons: [
          { src: 'icons/icon-dark.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icons/icon-dark.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Node >=22 ships an experimental global Web Storage that shadows jsdom's
    // localStorage with a non-functional stub (localStorage.clear is undefined)
    // unless --localstorage-file is given. Disable it so jsdom's Storage is used.
    execArgv: ['--no-experimental-webstorage'],
  },
})
