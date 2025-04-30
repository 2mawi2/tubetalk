import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

interface InputAreaProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  disabled: boolean;
  placeholder: string;
}

export interface InputAreaHandle {
  focus: () => void;
}

export const InputArea = forwardRef<InputAreaHandle, InputAreaProps>(({
  value,
  onChange,
  onKeyDown,
  disabled,
  placeholder
}, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus()
  }));

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 300)}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      id="yt-sidebar-chatInput"
      data-testid="yt-sidebar-chatInput"
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      rows={1}
    />
  );
});

InputArea.displayName = 'InputArea'; 