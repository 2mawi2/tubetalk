import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        },
        ecmaVersion: 'latest',
        sourceType: 'module'
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        chrome: 'readonly',
        localStorage: 'readonly',
        document: 'readonly',
        window: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        HTMLElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        MouseEvent: 'readonly',
        Event: 'readonly',
        AbortController: 'readonly',
        __dirname: 'readonly',
        forms: 'readonly',
        URLSearchParams: 'readonly',
        crypto: 'readonly',
        btoa: 'readonly',
        TextEncoder: 'readonly',
        URL: 'readonly',
        fetch: 'readonly',
        AbortSignal: 'readonly',
        ReadableStreamDefaultReader: 'readonly',
        ReadableStream: 'readonly',
        TextDecoder: 'readonly',
        React: 'readonly',
        CustomEvent: 'readonly',
        EventListener: 'readonly',
        MutationObserver: 'readonly',
        Element: 'readonly',
        Response: 'readonly',
        navigator: 'readonly',
        require: 'readonly',
        module: 'readonly',
        requestAnimationFrame: 'readonly',
        HTMLSelectElement: 'readonly',
        ClipboardItem: 'readonly',
        Blob: 'readonly',
        HTMLImageElement: 'readonly',
        ResizeObserver: 'readonly',
        ReadableStreamReadResult: 'readonly'
      }
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      '@typescript-eslint': typescript
    },
    settings: {
      react: {
        version: 'detect'
      }
    },
    rules: {
      // React rules
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/display-name': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'off',

      // TypeScript rules
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/ban-ts-comment': ['warn', {
        'ts-ignore': 'allow-with-description',
        'ts-expect-error': 'allow-with-description'
      }],
      '@typescript-eslint/no-non-null-assertion': 'off',

      // General rules
      'no-console': 'off',
      'no-constant-condition': ['error', {
        'checkLoops': false
      }],
      'no-unused-vars': 'off',
      'no-redeclare': 'off'
    }
  },
  {
    ignores: [
      'vendor/**/*',
      'dist/**/*',
      'node_modules/**/*',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/test/**/*',
      '**/tests/**/*',
      '**/e2e/**/*',
      'tailwind.config.mjs'
    ]
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/test/**/*', '**/tests/**/*', '**/e2e/**/*', '**/eval/**/*'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-console': 'off'
    }
  }
];