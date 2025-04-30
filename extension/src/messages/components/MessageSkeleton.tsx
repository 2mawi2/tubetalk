import React from 'react';

export const MessageSkeleton: React.FC = () => (
  <div className="message assistant" data-testid="message-loading">
    <div className="message__skeleton">
      <div className="message__skeleton-line"></div>
      <div className="message__skeleton-line"></div>
    </div>
  </div>
); 