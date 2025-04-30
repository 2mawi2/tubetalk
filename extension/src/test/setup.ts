import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup, configure } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);


// Mock CSS modules
vi.mock('*.scss', () => {
  return {
    default: {}
  };
});

// Mock video element globally
const mockVideo = {
  currentTime: 0,
  play: () => Promise.resolve()
};

// Mock querySelector for video elements
const originalQuerySelector = document.querySelector.bind(document);
document.querySelector = (selector: string) => {
  if (selector === 'video') {
    return mockVideo as unknown as HTMLElement;
  }
  return originalQuerySelector(selector);
};

// runs a cleanup after each test case
afterEach(() => {
  try {
    cleanup();
  } catch (error) {
    // Ignore cleanup errors in test environment
    if (process.env.NODE_ENV !== 'test') {
      console.error('Cleanup error:', error);
    }
  }
  
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.classList.remove('dark');
});

// do not output the whole DOM in the console to save tokens
configure({
  getElementError: (message: string | null, _?: Element) => {
    const error = new Error(message || '');
    error.name = 'TestingLibraryElementError';
    return error;
  },
  throwSuggestions: false // Disable suggestion output in errors
});
