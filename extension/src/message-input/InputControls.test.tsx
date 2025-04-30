import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { InputControls } from './InputControls';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { modelStore } from '../settings/modelStore';

vi.mock('../settings/modelStore', () => ({
  modelStore: {
    models: ['openai/gpt-4.1-8b'],
    availableModels: [
      { id: 'openai/gpt-4.1-8b', name: 'Gemini Flash' }
    ]
  }
}));

describe('InputControls', () => {
  const defaultProps = {
    onImageCapture: vi.fn(),
    onTimestampToggle: vi.fn(),
    onModelChange: vi.fn(),
    onSendMessage: vi.fn(),
    isTimestampEnabled: false,
    selectedModel: 'openai/gpt-4.1-8b',
    disabled: false,
    sendDisabled: false
  };

  beforeEach(() => {
    // No need to stub env anymore
  });

  it('renders all controls including model select', () => {
    render(<InputControls {...defaultProps} />);
    expect(screen.getByTestId('image-button')).toBeInTheDocument();
    expect(screen.getByTestId('timestamp-button')).toBeInTheDocument();
    expect(screen.getByTestId('model-select')).toBeInTheDocument();
    expect(screen.getByTestId('send-button')).toBeInTheDocument();
  });

  it('handles model selection change', () => {
    render(<InputControls {...defaultProps} />);
    const select = screen.getByTestId('model-select');
    const newModel = 'openai/gpt-4.1-8b';
    fireEvent.change(select, { target: { value: newModel } });
    expect(defaultProps.onModelChange).toHaveBeenCalledWith(newModel);
  });

  it('applies timestamp button selected state correctly', () => {
    const { rerender } = render(<InputControls {...defaultProps} isTimestampEnabled={true} />);
    expect(screen.getByTestId('timestamp-button')).toHaveClass('selected');
    rerender(<InputControls {...defaultProps} isTimestampEnabled={false} />);
    expect(screen.getByTestId('timestamp-button')).not.toHaveClass('selected');
  });

  it('disables controls when disabled prop is true', () => {
    render(<InputControls {...defaultProps} disabled={true} />);
    expect(screen.getByTestId('image-button')).toBeDisabled();
    expect(screen.getByTestId('timestamp-button')).toBeDisabled();
    expect(screen.getByTestId('model-select')).not.toBeDisabled();
    expect(screen.getByTestId('send-button')).toBeDisabled();
  });

  it('disables only send button when sendDisabled is true', () => {
    render(<InputControls {...defaultProps} sendDisabled={true} />);
    expect(screen.getByTestId('image-button')).not.toBeDisabled();
    expect(screen.getByTestId('timestamp-button')).not.toBeDisabled();
    expect(screen.getByTestId('model-select')).not.toBeDisabled();
    expect(screen.getByTestId('send-button')).toBeDisabled();
  });
}); 