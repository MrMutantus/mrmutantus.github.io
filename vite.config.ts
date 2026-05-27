import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'))

export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    target: 'es2023',
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
})
