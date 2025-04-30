import { useEffect, useState } from 'react';
import { videoDataService } from '../services/VideoDataService';

export const useVideoId = (): string | null => {
  const [videoId, setVideoId] = useState<string | null>(null);

  useEffect(() => {
    const getVideoId = () => {
      if (!window.location.href.includes('youtube.com/watch')) {
        return null;
      }
      try {
        const url = new URL(window.location.href);
        const videoId = url.searchParams.get('v');
        return videoId && videoId.length > 0 ? videoId : null;
      } catch {
        return null;
      }
    };

    let lastVideoId = getVideoId();
    console.log(`[useVideoId] Initial video ID:`, lastVideoId);

    const observer = new MutationObserver(() => {
      const currentVideoId = getVideoId();
      if (currentVideoId !== lastVideoId) {
        console.log(`[useVideoId] Video ID changed:`, {
          from: lastVideoId,
          to: currentVideoId
        });
        lastVideoId = currentVideoId;
        setVideoId(currentVideoId);
        if (currentVideoId) {
          console.log(`[useVideoId] Triggering preload for:`, currentVideoId);
          videoDataService.preloadVideoData(currentVideoId);
        }
      }
    });

    observer.observe(document.body, { 
      childList: true, 
      subtree: true 
    });

    const handleUrlChange = () => {
      const newVideoId = getVideoId();
      console.log(`[useVideoId] URL change detected:`, {
        from: lastVideoId,
        to: newVideoId
      });
      lastVideoId = newVideoId;
      setVideoId(newVideoId);
      if (newVideoId) {
        console.log(`[useVideoId] Triggering preload after URL change:`, newVideoId);
        videoDataService.preloadVideoData(newVideoId);
      }
    };

    window.addEventListener('popstate', handleUrlChange);
    
    const initialVideoId = getVideoId();
    setVideoId(initialVideoId);
    if (initialVideoId) {
      console.log(`[useVideoId] Initial preload for:`, initialVideoId);
      videoDataService.preloadVideoData(initialVideoId);
    }

    return () => {
      console.log(`[useVideoId] Cleaning up observers and listeners`);
      observer.disconnect();
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  return videoId;
}; 