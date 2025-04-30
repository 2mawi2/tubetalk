import { render, screen, fireEvent } from '@testing-library/react';
import { SuggestedQuestions } from './SuggestedQuestions';
import { describe, it, expect, vi } from 'vitest';

describe('SuggestedQuestions', () => {
  const mockQuestions = ['Question 1', 'Question 2'];
  const mockOnQuestionClick = vi.fn();

  it('renders nothing when no questions are provided', () => {
    const { container } = render(
      <SuggestedQuestions questions={[]} onQuestionClick={mockOnQuestionClick} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders questions as buttons', () => {
    render(
      <SuggestedQuestions 
        questions={mockQuestions} 
        onQuestionClick={mockOnQuestionClick} 
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toHaveTextContent('Question 1');
    expect(buttons[1]).toHaveTextContent('Question 2');
  });

  it('calls onQuestionClick when a question is clicked', () => {
    render(
      <SuggestedQuestions 
        questions={mockQuestions} 
        onQuestionClick={mockOnQuestionClick} 
      />
    );

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);

    expect(mockOnQuestionClick).toHaveBeenCalledWith('Question 1');
  });
}); 