// extension/vitest.config.ts
import { defineConfig, mergeConfig } from 'vitest/config';
import { UserConfig } from 'vite';
import { defineConfig as defineViteConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const viteConfig = defineViteConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@src': path.resolve(__dirname, './src')
    }
  },
  // Add css configuration to suppress Sass warnings
  css: {
    preprocessorOptions: {
      scss: {
        quietDeps: true,
        logger: {
          warn: () => { }
        }
      }
    }
  }
});
export default mergeConfig(viteConfig, defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    reporters: ['dot'],
    silent: true,
    logHeapUsage: false,
    
    setupFiles: ['./src/test/setup.ts'],
    include: ['./src/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**'
    ],
    testTimeout: 5000
  }
}));
