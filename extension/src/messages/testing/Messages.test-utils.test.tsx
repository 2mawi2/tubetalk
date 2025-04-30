import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderMessages } from './test-utils.tsx';
import { vi as viImport } from 'vitest';

// Mock the videoDataService
vi.mock('../../common/services/VideoDataService');

describe('Messages with test utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render welcome message using test utilities', async () => {
    // Render the component using our test utilities
    const { mocks } = renderMessages();
    
    // Wait for initialization
    await waitFor(() => {
      expect(mocks.mockOnMessagesUpdate).toHaveBeenCalled();
    }, { timeout: 1000 });
    
    // Verify the welcome message was created with the expected content
    expect(mocks.mockOnMessagesUpdate).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        id: 'welcome-message',
        role: 'assistant',
        content: 'How can I help you with this YouTube video?'
      })
    ]));
  });
}); 