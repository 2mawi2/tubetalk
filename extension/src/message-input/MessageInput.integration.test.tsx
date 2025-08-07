import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../common/translations/Translations', () => ({
  useTranslations: () => ({
    getMessage: (key: string) => key
  }),
  TranslationsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Mock storage adapter used by messageInputStore to control model preferences
vi.mock('../storage/storageAdapter', () => ({
  default: {
    getModelPreferences: vi.fn().mockResolvedValue(['openai/gpt-4o-mini', 'gpt-4.1']),
    setModelPreferences: vi.fn().mockResolvedValue(undefined)
  }
}));

import { MessageInput } from './MessageInput';
import storageAdapter from '../storage/storageAdapter';

describe('MessageInput integration - model options persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('shows the stored selected model in the dropdown even if settings was not opened', async () => {
    // Arrange: storage has a previously selected OpenAI model
    vi.mocked(storageAdapter.getModelPreferences).mockResolvedValueOnce(['openai/gpt-4o-mini', 'gpt-4.1']);

    render(<MessageInput onSendMessage={() => {}} />);

    // Act: wait for the model select to appear
    const select = await waitFor(() => screen.getByTestId('model-select'));

    // Assert: the dropdown should contain the previously selected model option
    // This reproduces the bug where options only included modelStore.models (default),
    // causing 'openai/gpt-4o-mini' to be missing until Settings initializes the store.
    const options = Array.from((select as HTMLSelectElement).querySelectorAll('option')).map(o => (o as HTMLOptionElement).value);
    expect(options).toContain('openai/gpt-4o-mini');
  });
});


