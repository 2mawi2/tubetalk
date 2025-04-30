import React from 'react';

interface ImagePreviewProps {
  imageUrl: string;
  onRemove: () => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({ imageUrl, onRemove }) => {
  if (!imageUrl) return null;

  return (
    <div className="captured-frame visible" data-testid="image-preview">
      <button 
        className="remove-frame" 
        onClick={onRemove}
        title="Remove frame"
      >
        ×
      </button>
      <img src={imageUrl} alt="Captured frame" />
    </div>
  );
}; 