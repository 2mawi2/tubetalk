import { render, screen, fireEvent } from '@testing-library/react';
import { MessageContent } from './MessageContent';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('MessageContent', () => {
  const mockOnClick = vi.fn();

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  it('renders text content correctly', () => {
    render(
      <MessageContent 
        content="Hello, world!" 
        onClick={mockOnClick}
      />
    );

    expect(screen.getByText('Hello, world!')).toBeInTheDocument();
  });

  it('renders timestamps correctly', () => {
    render(
      <MessageContent 
        content="Check this at §[1:23]§" 
        onClick={mockOnClick}
      />
    );

    const timestamp = screen.getByText('1:23');
    expect(timestamp).toHaveClass('timestamp-link');
    expect(timestamp).toHaveAttribute('data-timestamp', '1:23');
  });

  it('handles click events', () => {
    render(
      <MessageContent 
        content="Click me" 
        onClick={mockOnClick}
      />
    );

    fireEvent.click(screen.getByText('Click me'));
    expect(mockOnClick).toHaveBeenCalled();
  });

  it('renders image content correctly', () => {
    const imageContent = [{
      type: 'image_url' as const,
      image_url: { url: 'https://example.com/image.jpg' }
    }];

    render(
      <MessageContent 
        content={imageContent}
        onClick={mockOnClick}
      />
    );

    const image = screen.getByAltText('Message attachment');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('handles mixed content correctly', () => {
    const mixedContent = [
      { type: 'text' as const, text: 'Hello' },
      { type: 'image_url' as const, image_url: { url: 'https://example.com/image.jpg' } }
    ];

    render(
      <MessageContent 
        content={mixedContent}
        onClick={mockOnClick}
      />
    );

    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByAltText('Message attachment')).toBeInTheDocument();
  });
}); 