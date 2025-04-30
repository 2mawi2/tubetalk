import { render, fireEvent, screen } from '@testing-library/react';
import { Message } from './Message';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the translations module
vi.mock('../../common/translations/Translations', () => ({
  useTranslations: () => ({
    getMessage: (key: string) => {
      const translations: Record<string, string> = {
        shareTitle: 'Shared from TubeTalk - https://github.com/2mawi2/tubetalk',
        webShareApiNotAvailable: 'Sharing is not available in this browser',
        shareButtonTooltip: 'Share message',
        copyButtonTooltip: 'Copy message'
      };
      return translations[key] || key;
    }
  })
}));

describe('Message', () => {
  const mockMessage = {
    id: 'test-id',
    role: 'user' as const,
    content: 'Hello, this is a test message',
  };

  const mockClipboard = {
    writeText: vi.fn().mockImplementation(() => Promise.resolve())
  };

  const mockShare = vi.fn().mockImplementation(() => Promise.resolve());

  beforeEach(() => {
    // Mock clipboard API
    vi.stubGlobal('navigator', {
      clipboard: mockClipboard,
      share: mockShare
    });
    vi.stubGlobal('ClipboardItem', vi.fn());
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('renders user message correctly', () => {
    render(<Message message={mockMessage} />);
    
    const messageElement = screen.getByTestId(`message-${mockMessage.role}`);
    expect(messageElement).toHaveClass('message', 'user');
    expect(messageElement).toHaveTextContent(mockMessage.content);
  });

  it('does not show copy button for user messages', () => {
    render(<Message message={mockMessage} />);
    expect(screen.queryByTestId('copy-button')).not.toBeInTheDocument();
  });

  it('shows copy button for assistant messages', () => {
    const assistantMessage = {
      ...mockMessage,
      role: 'assistant' as const,
    };
    render(<Message message={assistantMessage} />);
    expect(screen.getByTestId('copy-button')).toBeInTheDocument();
  });

  it('copies message content when copy button is clicked in assistant message', async () => {
    const assistantMessage = {
      ...mockMessage,
      role: 'assistant' as const,
    };
    render(<Message message={assistantMessage} />);
    
    const copyButton = screen.getByTestId('copy-button');
    await fireEvent.click(copyButton);

    expect(mockClipboard.writeText).toHaveBeenCalled();
  });

  it('renders assistant message correctly', () => {
    const assistantMessage = {
      ...mockMessage,
      role: 'assistant' as const,
    };

    render(<Message message={assistantMessage} />);
    
    const messageElement = screen.getByTestId(`message-${assistantMessage.role}`);
    expect(messageElement).toHaveClass('message', 'assistant');
    expect(messageElement).toHaveTextContent(mockMessage.content);
  });

  it('renders suggested questions when provided', () => {
    const messageWithQuestions = {
      ...mockMessage,
      suggestedQuestions: ['Question 1', 'Question 2']
    };

    const onQuestionClick = vi.fn();
    render(<Message message={messageWithQuestions} onQuestionClick={onQuestionClick} />);

    const questions = screen.getAllByRole('button', { name: /Question \d/ });
    expect(questions).toHaveLength(2);
    expect(questions[0]).toHaveTextContent('Question 1');
    expect(questions[1]).toHaveTextContent('Question 2');
  });

  it('handles question clicks', () => {
    const messageWithQuestions = {
      ...mockMessage,
      suggestedQuestions: ['Question 1', 'Question 2']
    };

    const onQuestionClick = vi.fn();
    render(<Message message={messageWithQuestions} onQuestionClick={onQuestionClick} />);

    const questions = screen.getAllByRole('button', { name: /Question \d/ });
    fireEvent.click(questions[0]);

    expect(onQuestionClick).toHaveBeenCalledWith('Question 1');
  });

  it('renders timestamps as clickable links', () => {
    const messageWithTimestamp = {
      ...mockMessage,
      content: 'Check this part at §[1:23]§'
    };

    render(<Message message={messageWithTimestamp} />);
    
    const timestampLink = screen.getByText('1:23');
    expect(timestampLink).toHaveClass('timestamp-link');
    expect(timestampLink).toHaveAttribute('data-timestamp', '1:23');
  });

  it('handles timestamp clicks', () => {
    const messageWithTimestamp = {
      ...mockMessage,
      content: 'Check this part at §[1:23]§'
    };

    const onTimestampClick = vi.fn();
    render(<Message message={messageWithTimestamp} onTimestampClick={onTimestampClick} />);
    
    const timestampLink = screen.getByText('1:23');
    fireEvent.click(timestampLink);

    expect(onTimestampClick).toHaveBeenCalledWith('1:23');
  });

  it('renders loading skeleton when message is in loading state', () => {
    const loadingMessage = {
      id: 'test-id',
      role: 'assistant' as const,
      content: '',
      loading: true
    };

    render(<Message message={loadingMessage} />);
    
    const loadingElement = screen.getByTestId('message-loading');
    expect(loadingElement).toBeInTheDocument();
    expect(loadingElement.querySelector('.message__skeleton')).toBeInTheDocument();
    expect(loadingElement.querySelectorAll('.message__skeleton-line')).toHaveLength(2);
  });
}); 