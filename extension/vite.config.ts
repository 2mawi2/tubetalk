import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'
import { ManifestV3Export } from '@crxjs/vite-plugin'

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest: manifest as ManifestV3Export }),
  ],
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ["legacy-js-api"],
      },
    },
  },
  envPrefix: ['VITE_', 'OPENROUTER_', 'LLM_'],
})
