import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';
import fs from 'fs/promises';

type TestFixtures = {
  context: BrowserContext;
};

export const test = base.extend<TestFixtures>({
  context: async ({}, use) => {
    let context: BrowserContext | undefined;
    let userDataDir: string | undefined;

    try {
      console.log('Setting up test context...');
      
      const pathToExtension = path.join(process.cwd(), 'dist');
      console.log('Extension path:', pathToExtension);

      // Verify extension directory exists
      try {
        const stats = await fs.stat(pathToExtension);
        console.log('Extension directory exists:', stats.isDirectory());
        const contents = await fs.readdir(pathToExtension);
        console.log('Extension directory contents:', contents);
      } catch (e) {
        console.error('Error checking extension directory:', e);
        throw new Error('Extension directory not found or invalid');
      }

      userDataDir = path.join(process.cwd(), 'test-user-data-' + Math.random().toString(36).slice(2));
      console.log('User data directory:', userDataDir);

      await fs.mkdir(userDataDir, { recursive: true });

      console.log('Launching browser context...');
      const isCI = process.env.CI === 'true';

      context = await chromium.launchPersistentContext(userDataDir, {
        args: [
          `--disable-extensions-except=${pathToExtension}`,
          `--load-extension=${pathToExtension}`,
          '--no-sandbox',
          '--disable-dev-shm-usage'
        ],
        headless: isCI,
        viewport: { width: 1280, height: 720 },
        ignoreDefaultArgs: ['--disable-extensions']
      });

      // Create a dummy page to ensure context is ready
      const page = await context.newPage();
      await page.goto('about:blank').catch(() => {});
      console.log('Page created successfully');

      await use(context);
    } catch (error) {
      console.error('Error in context setup:', error);
      throw error;
    } finally {
      console.log('Starting cleanup...');
      if (context) {
        try {
          await context.close();
        } catch (e) {
          console.error('Error closing context:', e);
        }
      }
      
      if (userDataDir) {
        try {
          await fs.rm(userDataDir, { recursive: true, force: true });
        } catch (e) {
          console.error('Error removing user data directory:', e);
        }
      }
      console.log('Cleanup completed');
    }
  }
});

export const expect = test.expect;
