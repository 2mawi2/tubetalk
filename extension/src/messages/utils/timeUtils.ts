
export const convertTimestampToSeconds = (timestamp: string): number | null => {
  // Handle different formats: HH:MM:SS, MM:SS, M:SS
  const parts = timestamp.split(':').map(Number);
  
  if (parts.some(isNaN)) return null;
  
  if (parts.length === 3) { // HH:MM:SS
    const [hours, minutes, seconds] = parts;
    if (seconds >= 60 || minutes >= 60) return null;
    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) { // MM:SS or M:SS
    const [minutes, seconds] = parts;
    if (seconds >= 60) return null;
    return minutes * 60 + seconds;
  }
  
  return null;
};

export const convertTimestampsToLinks = (text: string, videoId?: string, isHtml: boolean = false): string => {
  return text.replace(/§\[(\d{1,2}:(?:\d{1,2}:)?\d{2})\]§/g, (_match: string, timestamp: string) => {
    const seconds = convertTimestampToSeconds(timestamp);
    if (seconds === null) return `[${timestamp}]`;
    
    // Remove leading zeros from timestamp display and handle optional hour part
    const parts = timestamp.split(':').map(part => parseInt(part, 10));
    let displayTimestamp = '';
    
    if (parts.length === 3) {
      // HH:MM:SS format
      displayTimestamp = `${parts[0]}:${parts[1].toString().padStart(2, '0')}:${parts[2].toString().padStart(2, '0')}`;
    } else {
      // MM:SS format
      displayTimestamp = `${parts[0]}:${parts[1].toString().padStart(2, '0')}`;
    }
    
    // If no videoId, just return the formatted timestamp
    if (!videoId) return `[${displayTimestamp}]`;
    
    const url = `https://www.youtube.com/watch?v=${videoId}&t=${seconds}s`;
    
    // Return HTML link for HTML content, Markdown for plain text
    return isHtml 
      ? `<a href="${url}" style="color: #0066cc; text-decoration: underline;">${displayTimestamp}</a>`
      : `[${displayTimestamp}](${url})`;
  });
};

export const seekToTimestamp = (timestamp: string) => {
  try {
    const parts = timestamp.split(':').map(Number);
    let seconds = 0;
    
    if (parts.length === 3) {
      seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else {
      seconds = parts[0] * 60 + parts[1];
    }
    
    const video = document.querySelector('video');
    if (video) {
      video.currentTime = seconds;
      // Only try to play if play() exists (it won't in test environment)
      if (typeof video.play === 'function') {
        video.play().catch(() => {
          // Ignore autoplay errors
        });
      }
    }
  } catch (error) {
    // Silently handle errors in test environment
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error seeking to timestamp:', error);
    }
  }
};

export const secondsToTimestamp = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const timestampToSeconds = (timestamp: string): number => {
  const parts = timestamp.split(':').map(Number);
  
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return parts[0] * 60 + parts[1];
}; 