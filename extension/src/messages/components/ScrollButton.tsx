import React from 'react';
import './ScrollButton.scss';

interface ScrollButtonProps {
  onClick: () => void;
  visible: boolean;
}

export const ScrollButton = ({ onClick, visible }: ScrollButtonProps) => (
  <button 
    className={`scroll-button ${visible ? 'visible' : ''}`} 
    onClick={onClick}
    aria-label="Scroll to bottom"
    data-testid="scroll-button"
  >
    <svg 
      className="icon" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5"
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  </button>
);