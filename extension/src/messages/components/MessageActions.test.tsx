import { render, fireEvent, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageActions } from './MessageActions';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the translations module
vi.mock('../../common/translations/Translations', () => ({
  useTranslations: () => ({
    getMessage: (key: string) => {
      const translations: Record<string, string> = {
        shareTitle: 'Shared from TubeTalk - https://github.com/2mawi2/tubetalk',
        webShareApiNotAvailable: 'Sharing is not available in this browser',
        shareButtonTooltip: 'Share message',
        copyButtonTooltip: 'Copy message',
        listenButtonTooltip: 'Listen',
        stopButtonTooltip: 'Stop'
      };
      return translations[key] || key;
    }
  })
}));

describe('MessageActions', () => {
  const mockContent = '<p>Test message content</p><ul><li>Item 1</li></ul>';
  // const mockPlainText = 'Test message content\nItem 1';
  const mockVideoId = 'test123';
  
  const mockClipboard = {
    writeText: vi.fn().mockImplementation(() => Promise.resolve()),
    write: vi.fn().mockImplementation(() => Promise.resolve())
  };

  const mockShare = vi.fn().mockImplementation(() => Promise.resolve());
  const mockClipboardItem = vi.fn();
  
  beforeEach(() => {
    // Mock clipboard API
    vi.stubGlobal('navigator', {
      clipboard: mockClipboard,
      share: mockShare
    });
    vi.stubGlobal('ClipboardItem', mockClipboardItem);
    vi.stubGlobal('alert', vi.fn());
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('renders message actions container for assistant messages', () => {
    render(<MessageActions content={mockContent} role="assistant" />);
    expect(screen.getByTestId('message-actions')).toBeInTheDocument();
  });

  it('does not render for user messages', () => {
    render(<MessageActions content={mockContent} role="user" />);
    expect(screen.queryByTestId('message-actions')).not.toBeInTheDocument();
  });

  it('renders not disabled when not streaming', async () => {
    vi.useFakeTimers();
    render(<MessageActions content={mockContent} role="assistant" />);
    
    // Initially the actions should be present but not visible
    const actions = screen.getByTestId('message-actions');
    expect(actions).toBeInTheDocument();
    expect(actions.classList.contains('enabled')).toBe(false);
    
    // After timeout, it should become visible
    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });
    
    expect(actions.classList.contains('disabled')).toBe(false);
    
    vi.useRealTimers();
  });

  it('copies rich text content when clipboard API supports it', async () => {
    render(<MessageActions content={mockContent} role="assistant" />);
    
    const copyButton = screen.getByTestId('copy-button');
    await act(async () => {
      await fireEvent.click(copyButton);
    });

    expect(mockClipboardItem).toHaveBeenCalledWith({
      'text/plain': expect.any(Blob),
      'text/html': expect.any(Blob)
    });
    expect(mockClipboard.write).toHaveBeenCalled();
  });

  it('falls back to plain text when rich copy fails', async () => {
    // Mock clipboard.write to fail
    mockClipboard.write.mockRejectedValueOnce(new Error('Rich copy failed'));
    
    render(<MessageActions content={mockContent} role="assistant" />);
    
    const copyButton = screen.getByTestId('copy-button');
    await act(async () => {
      await fireEvent.click(copyButton);
    });

    expect(mockClipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('Test message content'));
  });

  it('shows and hides check icon after copying', async () => {
    vi.useFakeTimers();
    render(<MessageActions content={mockContent} role="assistant" />);
    
    const copyButton = screen.getByTestId('copy-button');
    
    // Initially shows copy icon
    expect(screen.getByTestId('copy-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('check-icon')).not.toBeInTheDocument();
    
    // Click and wait for state updates
    await act(async () => {
      await fireEvent.click(copyButton);
      // Wait for state update
      await Promise.resolve();
    });

    // Verify check icon is shown
    expect(screen.queryByTestId('copy-icon')).not.toBeInTheDocument();
    expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    
    // After timeout, should revert to copy icon
    await act(async () => {
      vi.advanceTimersByTime(800);
      // Wait for all timeouts
      await Promise.resolve();
    });
    
    expect(screen.getByTestId('copy-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('check-icon')).not.toBeInTheDocument();
    
    vi.useRealTimers();
  });

  it('handles clipboard errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error');
    const mockError = new Error('Plain copy failed');
    
    // Mock both clipboard methods to fail
    vi.spyOn(navigator.clipboard, 'write').mockRejectedValueOnce(mockError);
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(mockError);

    render(<MessageActions content="Test content" role="assistant" />);
    
    const copyButton = screen.getByTestId('copy-button');
    await userEvent.click(copyButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Fallback copy failed:', mockError);
    });
  });

  it('shows button in disabled state when disabled prop is true', () => {
    render(<MessageActions content={mockContent} role="assistant" disabled={true} />);
    
    const copyButton = screen.getByTestId('copy-button');
    expect(copyButton).toBeDisabled();
    expect(copyButton).toHaveClass('disabled');
  });

  // New tests for the share button functionality
  it('renders share button next to copy button', () => {
    render(<MessageActions content={mockContent} role="assistant" />);
    
    expect(screen.getByTestId('copy-button')).toBeInTheDocument();
    expect(screen.getByTestId('share-button')).toBeInTheDocument();
    expect(screen.getByTestId('share-icon')).toBeInTheDocument();
  });

  it('uses Web Share API when available', async () => {
    render(<MessageActions content={mockContent} role="assistant" videoId={mockVideoId} />);
    
    const shareButton = screen.getByTestId('share-button');
    await act(async () => {
      await fireEvent.click(shareButton);
    });

    expect(mockShare).toHaveBeenCalledWith({
      title: 'Shared from TubeTalk - https://github.com/2mawi2/tubetalk',
      text: expect.stringContaining('Test message content'),
      url: `https://www.youtube.com/watch?v=${mockVideoId}`
    });

    // Verify the title contains the website link
    const shareCall = mockShare.mock.calls[0][0];
    expect(shareCall.text).not.toContain('YouTube: https://www.youtube.com/watch?v=test123');
    expect(shareCall.text).not.toContain('Shared via TubeTalk: https://github.com/2mawi2/tubetalk');
    expect(shareCall.title).toContain('https://github.com/2mawi2/tubetalk');
  });

  it('logs error when Web Share API is not available', async () => {
    // Create a navigator mock without the share method
    vi.stubGlobal('navigator', {
      clipboard: mockClipboard
      // share is intentionally omitted
    });
    
    const consoleSpy = vi.spyOn(console, 'error');
    
    render(<MessageActions content={mockContent} role="assistant" videoId={mockVideoId} />);
    
    const shareButton = screen.getByTestId('share-button');
    await act(async () => {
      await fireEvent.click(shareButton);
    });

    expect(consoleSpy).toHaveBeenCalledWith('Sharing is not available in this browser');
    expect(mockClipboard.writeText).not.toHaveBeenCalled();
  });

  it('shows and hides check icon after sharing', async () => {
    vi.useFakeTimers();
    render(<MessageActions content={mockContent} role="assistant" videoId={mockVideoId} />);
    
    const shareButton = screen.getByTestId('share-button');
    
    // Initially shows share icon
    expect(screen.getByTestId('share-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('check-icon-share')).not.toBeInTheDocument();
    
    // Click and wait for state updates
    await act(async () => {
      await fireEvent.click(shareButton);
      // Wait for state update
      await Promise.resolve();
    });

    // Verify check icon is shown
    expect(screen.queryByTestId('share-icon')).not.toBeInTheDocument();
    expect(screen.getByTestId('check-icon-share')).toBeInTheDocument();
    
    // After timeout, should revert to share icon
    await act(async () => {
      vi.advanceTimersByTime(800);
      // Wait for all timeouts
      await Promise.resolve();
    });
    
    expect(screen.getByTestId('share-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('check-icon-share')).not.toBeInTheDocument();
    
    vi.useRealTimers();
  });

  it('handles share errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error');
    const mockError = new Error('Share failed');
    
    // Mock share to fail
    mockShare.mockRejectedValueOnce(mockError);

    render(<MessageActions content={mockContent} role="assistant" videoId={mockVideoId} />);
    
    const shareButton = screen.getByTestId('share-button');
    await act(async () => {
      await fireEvent.click(shareButton);
    });

    expect(consoleSpy).toHaveBeenCalledWith('Sharing failed:', mockError);
    expect(mockClipboard.writeText).not.toHaveBeenCalled();
  });

  it('shows share button in disabled state when disabled prop is true', () => {
    render(<MessageActions content={mockContent} role="assistant" disabled={true} />);
    
    const shareButton = screen.getByTestId('share-button');
    expect(shareButton).toBeDisabled();
    expect(shareButton).toHaveClass('disabled');
  });

  // ===== TTS (Listen) button tests =====
  it('renders listen button when canListen is true and onListen is provided', () => {
    const onListen = vi.fn().mockResolvedValue({ stop: vi.fn() });
    render(
      <MessageActions 
        content={mockContent} 
        role="assistant" 
        canListen={true}
        onListen={onListen}
      />
    );
    const listenButton = screen.getByTestId('listen-button');
    expect(listenButton).toBeInTheDocument();
    expect(listenButton).toHaveAttribute('aria-label', 'Listen');
  });

  it('does not render listen button when canListen is false (e.g., during streaming)', () => {
    const onListen = vi.fn().mockResolvedValue({ stop: vi.fn() });
    render(
      <MessageActions 
        content={mockContent} 
        role="assistant" 
        canListen={false}
        onListen={onListen}
      />
    );
    expect(screen.queryByTestId('listen-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('stop-button')).not.toBeInTheDocument();
  });

  it('invokes onListen with plain text (no HTML) and toggles to stop state', async () => {
    const stop = vi.fn();
    const onListen = vi.fn().mockResolvedValue({ stop });
    render(
      <MessageActions 
        content={mockContent} 
        role="assistant" 
        canListen={true}
        onListen={onListen}
      />
    );

    const listenButton = screen.getByTestId('listen-button');
    await userEvent.click(listenButton);

    // Should call onListen with plain text (no <p> or <li>)
    expect(onListen).toHaveBeenCalledWith(expect.stringContaining('Test message content'));
    expect(onListen).toHaveBeenCalledWith(expect.not.stringContaining('<p>'));
    expect(onListen).toHaveBeenCalledWith(expect.stringContaining('Item 1'));

    // Should toggle to stop
    const stopButton = await screen.findByTestId('stop-button');
    expect(stopButton).toBeInTheDocument();
    expect(stopButton).toHaveAttribute('aria-label', 'Stop');
  });

  it('stops playback when stop is clicked and returns to listen state', async () => {
    const stop = vi.fn();
    const onListen = vi.fn().mockResolvedValue({ stop });
    render(
      <MessageActions 
        content={mockContent} 
        role="assistant" 
        canListen={true}
        onListen={onListen}
      />
    );

    const listenButton = screen.getByTestId('listen-button');
    await userEvent.click(listenButton);

    const stopButton = await screen.findByTestId('stop-button');
    await userEvent.click(stopButton);

    expect(stop).toHaveBeenCalled();
    // Back to listen
    expect(await screen.findByTestId('listen-button')).toBeInTheDocument();
  });
}); 