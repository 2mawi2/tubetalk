import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv-flow';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const apiKey = process.env.OPENROUTER_API_KEY;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  testDir: path.join(__dirname, 'test'),
  testMatch: 'screenshots.test.ts',
  timeout: 120000,
  use: {
    baseURL: 'https://www.youtube.com',
    permissions: ['notifications'],
    actionTimeout: 30000,
    navigationTimeout: 60000,
    launchOptions: {
      args: [
        `--disable-extensions-except=${path.join(process.cwd(), 'dist')}`,
        `--load-extension=${path.join(process.cwd(), 'dist')}`,
        '--no-sandbox',
        '--disable-dev-shm-usage'
      ],
      env: {
        ...process.env,
        OPENROUTER_API_KEY: apiKey || '',
      },
    },
  },
  projects: [
    {
      name: 'screenshots',
      use: {
        headless: false,
        viewport: { width: 1280, height: 800 }
      }
    }
  ],
  reporter: [['line']]
}); 