import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv-flow';

// Load environment variables
dotenv.config();

process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const apiKey = process.env.OPENROUTER_API_KEY;

export default defineConfig({
  testDir: './',
  testIgnore: '**/screenshots/**',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : 8,
  timeout: 180000,
  use: {
    baseURL: 'https://www.youtube.com',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    permissions: ['notifications'],
    actionTimeout: 60000,
    navigationTimeout: 120000,
    launchOptions: {
      env: {
        ...process.env,
        OPENROUTER_API_KEY: apiKey || '',
      },
    },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-dev-shm-usage'
          ]
        }
      }
    },
    {
      name: 'screenshots',
      testDir: './screenshots',
      testMatch: /screenshots\.test\.ts/
    }
  ],
  reporter: [
    ['html'],
    ['line']
  ]
});
