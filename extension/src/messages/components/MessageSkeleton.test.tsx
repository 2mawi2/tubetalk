import { render, screen } from '@testing-library/react';
import { MessageSkeleton } from './MessageSkeleton';
import { describe, it, expect } from 'vitest';

describe('MessageSkeleton', () => {
  it('renders loading skeleton', () => {
    render(<MessageSkeleton />);
    
    const loadingElement = screen.getByTestId('message-loading');
    expect(loadingElement).toBeInTheDocument();
    expect(loadingElement).toHaveClass('message', 'assistant');
    
    const skeletonLines = loadingElement.querySelectorAll('.message__skeleton-line');
    expect(skeletonLines).toHaveLength(2);
  });
}); 