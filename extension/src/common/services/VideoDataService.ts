import { VideoDataError, NoCaptionsVideoDataError, DataAccessVideoDataError, TokenLimitExceededError } from '../errors/VideoDataError';
import { getEncoding } from 'js-tiktoken';
import { fetchYouTubeTranscript } from './YouTubeTranscriptAPI';

interface VideoData {
  videoId: string;
  title: string;
  description: string;
  transcript: string;
  timestamp: number;
}

interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  kind: string;
}

interface CacheEntry {
  data: VideoData;
  expiresAt: number;
}

export class VideoDataService {
  private static CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  private static MAX_RETRIES = 3;
  private static RETRY_DELAY = 1000; // 1 second
  private static OUTPUT_TOKENS = 3000;
  private static MAX_TOKENS = 128000 - VideoDataService.OUTPUT_TOKENS;  // 128k token limit

  private videoDataCache = new Map<string, CacheEntry>();
  private videoDataRequests = new Map<string, Promise<VideoData>>();
  private currentVideoData: VideoData | null = null;
  private isInitialDataFetch = true;
  private preloadTimeout: number | null = null;
  private activeControllers = new Map<string, AbortController>();

  private logCacheStatus(videoId: string, action: string, details?: string) {
    const cacheSize = this.videoDataCache.size;
    const activeRequests = this.videoDataRequests.size;
    const cachedIds = Array.from(this.videoDataCache.keys());
    
    console.log(`[VideoDataService] ${action}`, {
      videoId,
      cacheSize,
      activeRequests,
      cachedIds,
      ...(details ? { details } : {})
    });
  }

  private compareTracks(track1: CaptionTrack, track2: CaptionTrack): number {
    const langCode1 = track1.languageCode;
    const langCode2 = track2.languageCode;

    if (langCode1 === 'en' && langCode2 !== 'en') return -1;
    if (langCode1 !== 'en' && langCode2 === 'en') return 1;
    if (track1.kind !== 'asr' && track2.kind === 'asr') return -1;
    if (track1.kind === 'asr' && track2.kind !== 'asr') return 1;
    return 0;
  }

  private formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private async generateYouTubeAPIAuthHeader(): Promise<string> {
    // Extract SAPISID from cookies
    const sapisid = document.cookie
      .split(';')
      .find(cookie => cookie.trim().startsWith('SAPISID='))
      ?.split('=')[1];
    
    if (!sapisid) {
      console.log('[VideoDataService] SAPISID cookie not found - user may not be logged in to YouTube');
      throw new Error('SAPISID cookie not found - YouTube authentication required');
    }
    
    const timestamp = Math.floor(Date.now() / 1000);
    const origin = 'https://www.youtube.com';
    
    // Create hash similar to YouTube's SAPISIDHASH
    const hashInput = `${timestamp}_${sapisid}_${origin}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(hashInput);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return `SAPISIDHASH ${timestamp}_${hashHex}`;
  }

  private async fetchTranscriptWithNewAPI(videoId: string, signal?: AbortSignal, retryCount = 0): Promise<any> {
    try {
      // Check if already aborted
      if (signal?.aborted) {
        throw new Error('Request aborted');
      }

      // Get visitor data from YouTube's global state
      const visitorData = (window as any).ytcfg?.get?.('VISITOR_DATA') || '';
      
      // Generate auth header
      const authHeader = await this.generateYouTubeAPIAuthHeader();
      
      return await fetchYouTubeTranscript({
        videoId,
        authHeader,
        visitorData,
        signal
      });
    } catch (error) {
      if (signal?.aborted) {
        throw new Error('Request aborted');
      }
      
      if (retryCount < VideoDataService.MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, VideoDataService.RETRY_DELAY));
        return this.fetchTranscriptWithNewAPI(videoId, signal, retryCount + 1);
      }
      throw error;
    }
  }

  private async fetchTranscriptWithRetry(baseUrl: string, signal?: AbortSignal, retryCount = 0): Promise<any> {
    try {
      // Check if already aborted
      if (signal?.aborted) {
        throw new Error('Request aborted');
      }

      // Legacy API method - known to return empty responses but kept for potential future fixes
      const transcriptResponse = await fetch(baseUrl + '&fmt=json3', { 
        credentials: 'include',
        signal 
      });
      if (!transcriptResponse.ok) {
        throw new Error(`HTTP error! status: ${transcriptResponse.status}`);
      }
      
      const responseText = await transcriptResponse.text();
      
      // Check if response is empty (current YouTube behavior)
      if (!responseText || responseText.trim().length === 0) {
        throw new Error('Empty response from legacy API');
      }
      
      // Check if response is HTML (indicates login redirect or blocking)
      if (responseText.trim().startsWith('<')) {
        throw new Error('HTML response instead of JSON');
      }
      
      return await JSON.parse(responseText);
    } catch (error) {
      if (signal?.aborted) {
        throw new Error('Request aborted');
      }
      
      if (retryCount < VideoDataService.MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, VideoDataService.RETRY_DELAY));
        return this.fetchTranscriptWithRetry(baseUrl, signal, retryCount + 1);
      }
      throw error;
    }
  }

  private async findTranscriptButton(): Promise<Element | null> {
    const selectors = [
      'button[aria-label*="transcript" i]',
      'button[aria-label*="Show transcript"]',
      'button[aria-label*="Hide transcript"]',
      'button[aria-label*="Transcript"]',
      '[role="button"][aria-label*="transcript" i]',
      '.ytd-transcript-footer-renderer button',
      'yt-button-renderer[aria-label*="transcript" i]',
      'ytd-menu-service-item-renderer[aria-label*="transcript" i]',
      'button[aria-label*="transkript" i]',
      'button[aria-label*="transcription" i]',
      'button[data-tooltip-text*="transcript" i]'
    ];
    
    for (const selector of selectors) {
      const button = document.querySelector(selector);
      if (button) {
        return button;
      }
    }
    
    // Check more actions menu
    const moreButton = document.querySelector('#top-level-buttons-computed button[aria-label*="More actions"], ytd-menu-renderer button[aria-label*="More actions"], button[aria-label*="More actions"]');
    if (moreButton) {
      (moreButton as HTMLElement).click();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const menuItems = document.querySelectorAll('ytd-menu-service-item-renderer, tp-yt-paper-item');
      for (const item of menuItems) {
        const text = item.textContent?.toLowerCase() || '';
        if (text.includes('transcript') || text.includes('transkript') || text.includes('transcription')) {
          return item;
        }
      }
    }
    
    return null;
  }

  private async extractTranscriptFromUI(): Promise<string> {
    const transcriptButton = await this.findTranscriptButton();
    if (!transcriptButton) {
      throw new DataAccessVideoDataError('No transcript button found');
    }
    
    // Click the transcript button
    (transcriptButton as HTMLElement).click();
    
    // Wait for transcript panel to load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Try to find transcript content in various containers
    const transcriptSelectors = [
      '.ytd-transcript-segment-renderer',
      '.ytd-transcript-segment-list-renderer .segment',
      '#transcript .segment',
      '.transcript-text',
      '.ytd-transcript-renderer .segment',
      '[data-testid="transcript-segment"]'
    ];
    
    for (const selector of transcriptSelectors) {
      const segments = document.querySelectorAll(selector);
      if (segments.length > 0) {
        const lines = Array.from(segments).map((segment, index) => {
          const timeElement = segment.querySelector('.timestamp, .time, [data-start]');
          const textElement = segment.querySelector('.text, .transcript-text') || segment;
          
          const timeText = timeElement?.textContent?.trim() || `${Math.floor(index * 10 / 60)}:${(index * 10) % 60}`;
          const text = textElement?.textContent?.trim() || '';
          
          return text ? `${timeText} - ${text}` : '';
        }).filter(line => line);
        
        if (lines.length > 0) {
          return lines.join('\n');
        }
      }
    }
    
    // If structured segments not found, try to get all text from transcript container
    const transcriptContainer = document.querySelector('.ytd-transcript-renderer, #transcript, .transcript-container');
    if (transcriptContainer) {
      const text = transcriptContainer.textContent?.trim() || '';
      if (text.length > 100) {
        return text;
      }
    }
    
    throw new DataAccessVideoDataError('Could not extract transcript from UI');
  }

  private async fetchTranscriptFromDOM(videoId: string, signal?: AbortSignal): Promise<string> {
    // Check if already aborted
    if (signal?.aborted) {
      throw new Error('Request aborted');
    }

    // First try UI-based extraction
    try {
      return await this.extractTranscriptFromUI();
    } catch (uiError) {
      // Check again before fallback
      if (signal?.aborted) {
        throw new Error('Request aborted');
      }
      // Fallback to legacy script tag extraction
    }
    
    // Fallback to script tag extraction (legacy method)
    const scriptTags = document.querySelectorAll('script');
    for (const script of scriptTags) {
      if (signal?.aborted) {
        throw new Error('Request aborted');
      }
      
      const content = script.textContent || '';
      
      if (content.includes('captionTracks') && content.includes(videoId)) {
        try {
          const match = content.match(/ytInitialPlayerResponse\s*=\s*({[\s\S]+?})\s*;/);
          if (match) {
            const playerResponse = JSON.parse(match[1]);
            if (playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks) {
              const tracks = playerResponse.captions.playerCaptionsTracklistRenderer.captionTracks;
              tracks.sort(this.compareTracks);
              const transcript = await this.fetchTranscriptWithRetry(tracks[0].baseUrl, signal);
              
              if (transcript.events) {
                const lines = transcript.events
                  .filter((event: any) => event.segs)
                  .map((event: any) => {
                    const startTimeMs = event.tStartMs || 0;
                    const startTime = this.formatTime(startTimeMs);
                    const text = event.segs
                      .map((seg: any) => seg.utf8)
                      .join('')
                      .trim();
                    return { startTime, text };
                  })
                  .filter((line: any) => line.text);

                return lines.map((line: any) => `${line.startTime} - ${line.text}`).join('\n');
              }
            }
          }
        } catch (error) {
          continue;
        }
      }
    }
    
    throw new DataAccessVideoDataError('Could not extract transcript from DOM or UI');
  }

  private processNewAPITranscript(segments: any[]): string {
    const lines = segments.map((segmentWrapper: any) => {
      const segment = segmentWrapper.transcriptSegmentRenderer;
      if (!segment) return null;
      
      const startMs = parseInt(segment.startMs) || 0;
      const startTime = this.formatTime(startMs);
      const text = segment.snippet?.runs?.[0]?.text || '';
      
      return text ? `${startTime} - ${text.trim()}` : null;
    }).filter(line => line);

    return lines.join('\n');
  }

  private async fetchTranscriptRace(playerResponse: any, videoId: string): Promise<string> {
    const controller = new AbortController();
    const signal = controller.signal;
    const startTime = Date.now();
    
    // Register controller for cancellation
    this.activeControllers.set(videoId, controller);

    // Helper to create a promise that rejects when aborted
    const createAbortablePromise = async (
      fetchFn: () => Promise<string>,
      methodName: string
    ): Promise<string> => {
      try {
        console.log(`[VideoDataService] Starting ${methodName} attempt`);
        const result = await fetchFn();
        const elapsed = Date.now() - startTime;
        console.log(`[VideoDataService] ${methodName} succeeded in ${elapsed}ms`);
        return result;
      } catch (error) {
        const elapsed = Date.now() - startTime;
        if (signal.aborted || (error as Error).message === 'Request aborted') {
          console.log(`[VideoDataService] ${methodName} aborted after ${elapsed}ms`);
          throw new Error('Request aborted');
        }
        console.log(`[VideoDataService] ${methodName} failed after ${elapsed}ms:`, error);
        throw error;
      }
    };

    // Prepare all transcript fetch methods
    const promises: Promise<string>[] = [];

    // Method 1: New YouTube API
    promises.push(
      createAbortablePromise(async () => {
        const result = await this.fetchTranscriptWithNewAPI(videoId, signal);
        if (result.segments) {
          return this.processNewAPITranscript(result.segments);
        }
        throw new Error('No segments in new API response');
      }, 'New YouTube API')
    );

    // Method 2: Legacy API (if caption tracks available)
    const tracks = playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (tracks && tracks.length > 0) {
      const sortedTracks = [...tracks].sort(this.compareTracks.bind(this));
      
      promises.push(
        createAbortablePromise(async () => {
          const transcript = await this.fetchTranscriptWithRetry(sortedTracks[0].baseUrl, signal);
          
          if (!transcript.events) {
            throw new DataAccessVideoDataError('No events in legacy API response');
          }

          const lines = transcript.events
            .filter((event: any) => event.segs)
            .map((event: any) => {
              const startTimeMs = event.tStartMs || 0;
              const startTime = this.formatTime(startTimeMs);
              const text = event.segs
                .map((seg: any) => seg.utf8)
                .join('')
                .trim();
              return { startTime, text };
            })
            .filter((line: any) => line.text);

          return lines.map((line: any) => `${line.startTime} - ${line.text}`).join('\n');
        }, 'Legacy API')
      );
    }

    // Method 3: DOM extraction
    promises.push(
      createAbortablePromise(
        () => this.fetchTranscriptFromDOM(videoId, signal),
        'DOM extraction'
      )
    );

    // Implement proper "first success wins" pattern
    return new Promise((resolve, reject) => {
      let completedCount = 0;
      let hasResolved = false;
      const errors: Error[] = [];

      const cleanup = () => {
        controller.abort();
        this.activeControllers.delete(videoId);
      };

      promises.forEach((promise) => {
        promise
          .then((result) => {
            if (!hasResolved) {
              hasResolved = true;
              const totalElapsed = Date.now() - startTime;
              console.log(`[VideoDataService] Transcript fetched successfully in ${totalElapsed}ms`);
              cleanup();
              resolve(result);
            }
          })
          .catch((error) => {
            errors.push(error);
            completedCount++;

            // If all promises have completed and none succeeded
            if (completedCount === promises.length && !hasResolved) {
              const totalElapsed = Date.now() - startTime;
              console.log(`[VideoDataService] All transcript methods failed after ${totalElapsed}ms`);
              cleanup();

              // Check if we have no captions at all
              if (!playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks || 
                  playerResponse.captions.playerCaptionsTracklistRenderer.captionTracks.length === 0) {
                reject(new NoCaptionsVideoDataError());
              } else {
                reject(new DataAccessVideoDataError('All transcript fetch methods failed'));
              }
            }
          });
      });
    });
  }

  private async fetchTranscript(playerResponse: any, videoId: string): Promise<string> {
    return this.fetchTranscriptRace(playerResponse, videoId);
  }

  private getPlayerResponseFromWindow(videoId: string): any | null {
    const w = window as any;
    if (w.ytInitialPlayerResponse && w.ytInitialPlayerResponse.videoDetails) {
      const pr = w.ytInitialPlayerResponse;
      if (pr.videoDetails.videoId === videoId) {
        return pr;
      }
    }
    return null;
  }

  private async fetchPlayerResponseFromHTML(videoId: string): Promise<any> {
    let response: Response;
    try {
      // Try both with and without credentials
      response = await fetch('https://www.youtube.com/watch?v=' + videoId, { credentials: 'omit' });
      if (!response.ok) {
        console.log(`[VideoDataService] Retrying HTML fetch with credentials included`);
        response = await fetch('https://www.youtube.com/watch?v=' + videoId, { credentials: 'include' });
      }
    } catch (error) {
      // If network fails
      throw new DataAccessVideoDataError('Network error');
    }

    if (!response.ok) {
      throw new DataAccessVideoDataError('Failed to fetch video page');
    }

    const html = await response.text();
    // Use a more robust regex to match across multiple lines
    const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({[\s\S]+?})\s*;/);
    if (!playerResponseMatch) {
      throw new DataAccessVideoDataError('No ytInitialPlayerResponse found in HTML');
    }

    let playerResponse: any;
    try {
      playerResponse = JSON.parse(playerResponseMatch[1]);
    } catch (error) {
      throw new DataAccessVideoDataError('Invalid ytInitialPlayerResponse JSON');
    }

    if (!playerResponse.videoDetails || playerResponse.videoDetails.videoId !== videoId) {
      throw new DataAccessVideoDataError('Invalid or mismatched video ID in playerResponse');
    }
    return playerResponse;
  }

  private async fetchVideoDataFromAPI(videoId: string): Promise<VideoData> {
    console.log(`[VideoDataService] Getting video data for:`, videoId);
    try {
      let playerResponse = this.getPlayerResponseFromWindow(videoId);

      if (!playerResponse) {
        console.log(`[VideoDataService] Player response not found in window, fetching HTML`);
        playerResponse = await this.fetchPlayerResponseFromHTML(videoId);
      }

      const videoDetails = playerResponse.videoDetails;
      const title = videoDetails?.title || '';
      const description = videoDetails?.shortDescription || '';

      console.log(`[VideoDataService] Got video details:`, { title, descriptionLength: description.length });

      const transcript = await this.fetchTranscript(playerResponse, videoId);

      return {
        videoId,
        title,
        description,
        transcript,
        timestamp: Date.now()
      };
    } catch (error: any) {
      if (error instanceof VideoDataError) {
        throw error;
      }
      throw new DataAccessVideoDataError(error.message || 'Unknown data access error');
    }
  }

  private countTokens(text: string): number {
    try {
      const enc = getEncoding("cl100k_base"); // Using cl100k_base as it's used by GPT-4 and most recent models
      const tokens = enc.encode(text);
      const count = tokens.length;
      return count;
    } catch (error) {
      console.error('[VideoDataService] Error counting tokens:', error);
      // Fallback to character-based estimation if tiktoken fails
      return Math.ceil(text.length / 4);
    }
  }

  private async checkTokenLimit(title: string, description: string, transcript: string): Promise<void> {
    const totalContent = `${title}\n${description}\n${transcript}`;
    const tokenCount = this.countTokens(totalContent);
    
    if (tokenCount > VideoDataService.MAX_TOKENS) {
      console.log(`[VideoDataService] Token limit exceeded: ${tokenCount} tokens`);
      throw new TokenLimitExceededError();
    }
  }

  public async fetchVideoData(videoId: string): Promise<VideoData> {
    if (!videoId) {
      throw new Error('No video ID provided');
    }

    const cachedEntry = this.videoDataCache.get(videoId);
    if (cachedEntry) {
      const isExpired = cachedEntry.expiresAt <= Date.now();
      this.logCacheStatus(videoId, isExpired ? 'Cache expired' : 'Cache hit', 
        `Expires in ${Math.round((cachedEntry.expiresAt - Date.now()) / 1000)}s`);
      
      if (!isExpired) {
        return cachedEntry.data;
      }
    }

    const existingRequest = this.videoDataRequests.get(videoId);
    if (existingRequest) {
      this.logCacheStatus(videoId, 'Using existing request');
      return existingRequest;
    }

    if (this.currentVideoData && 
        this.currentVideoData.videoId === videoId && 
        !this.isInitialDataFetch) {
      this.logCacheStatus(videoId, 'Using current video data');
      return this.currentVideoData;
    }

    this.logCacheStatus(videoId, 'Cache miss, fetching from API');
    
    const fetchAndValidate = async () => {
      const videoData = await this.fetchVideoDataFromAPI(videoId);
      await this.checkTokenLimit(
        videoData.title,
        videoData.description,
        videoData.transcript
      );

      this.videoDataCache.set(videoId, {
        data: videoData,
        expiresAt: Date.now() + VideoDataService.CACHE_DURATION
      });

      this.currentVideoData = videoData;
      this.isInitialDataFetch = false;

      this.logCacheStatus(videoId, 'Successfully cached video data');
      return videoData;
    };

    const requestPromise = new Promise<VideoData>((resolve, reject) => {
      fetchAndValidate()
        .then(resolve)
        .catch((error) => {
          this.logCacheStatus(videoId, 'Error fetching video data', error instanceof Error ? error.message : 'Unknown error');
          reject(error);
        })
        .finally(() => {
          this.videoDataRequests.delete(videoId);
        });
    });

    this.videoDataRequests.set(videoId, requestPromise);
    return requestPromise;
  }

  public preloadVideoData(videoId: string): void {
    if (this.preloadTimeout) {
      window.clearTimeout(this.preloadTimeout);
    }

    this.preloadTimeout = window.setTimeout(() => {
      console.log(`[VideoDataService] Preloading video data for:`, videoId);
      this.fetchVideoData(videoId).catch(() => {});
      this.preloadTimeout = null;
    }, 100);
  }

  public resetState(): void {
    this.logCacheStatus('', 'Resetting state');
    this.cancelAllRequests();
    this.currentVideoData = null;
    this.isInitialDataFetch = true;
    this.videoDataRequests.clear();
    this.videoDataCache.clear();
    if (this.preloadTimeout) {
      window.clearTimeout(this.preloadTimeout);
      this.preloadTimeout = null;
    }
  }

  public clearCache(): void {
    this.logCacheStatus('', 'Clearing cache');
    this.videoDataCache.clear();
  }

  public cancelVideoDataRequest(videoId: string): void {
    const controller = this.activeControllers.get(videoId);
    if (controller) {
      controller.abort();
      this.activeControllers.delete(videoId);
      console.log(`[VideoDataService] Cancelled request for video: ${videoId}`);
    }
  }

  public cancelAllRequests(): void {
    for (const [videoId, controller] of this.activeControllers) {
      controller.abort();
      console.log(`[VideoDataService] Cancelled request for video: ${videoId}`);
    }
    this.activeControllers.clear();
  }
}

export const videoDataService = new VideoDataService();
