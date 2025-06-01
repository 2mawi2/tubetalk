import { VideoDataError, NoCaptionsVideoDataError, DataAccessVideoDataError, TokenLimitExceededError } from '../errors/VideoDataError';
import { getEncoding } from 'js-tiktoken';

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

  private async fetchTranscriptWithRetry(baseUrl: string, retryCount = 0): Promise<any> {
    try {
      console.log(`[VideoDataService] Fetching transcript, attempt ${retryCount + 1}`);
      const transcriptResponse = await fetch(baseUrl + '&fmt=json3', {
        credentials: 'include'
      });
      if (!transcriptResponse.ok) {
        throw new Error(`HTTP error! status: ${transcriptResponse.status}`);
      }
      console.log(`[VideoDataService] Transcript fetch successful`);
      return await transcriptResponse.json();
    } catch (error) {
      if (retryCount < VideoDataService.MAX_RETRIES) {
        console.log(`[VideoDataService] Transcript fetch failed, retrying in ${VideoDataService.RETRY_DELAY}ms`);
        await new Promise(resolve => setTimeout(resolve, VideoDataService.RETRY_DELAY));
        return this.fetchTranscriptWithRetry(baseUrl, retryCount + 1);
      }
      throw error;
    }
  }

  private async fetchTranscript(playerResponse: any): Promise<string> {
    if (!playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks) {
      throw new NoCaptionsVideoDataError();
    }

    const tracks = playerResponse.captions.playerCaptionsTracklistRenderer.captionTracks;
    if (!tracks || tracks.length === 0) {
      throw new NoCaptionsVideoDataError();
    }

    tracks.sort(this.compareTracks);
    console.log(`[VideoDataService] Selected caption track:`, {
      languageCode: tracks[0].languageCode,
      kind: tracks[0].kind
    });
    
    try {
      const transcript = await this.fetchTranscriptWithRetry(tracks[0].baseUrl);

      if (!transcript.events) {
        throw new DataAccessVideoDataError();
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

      console.log(`[VideoDataService] Processed transcript lines:`, lines.length);
      return lines.map((line: any) => `${line.startTime} - ${line.text}`).join('\n');
    } catch (error) {
      if (error instanceof VideoDataError) {
        throw error;
      }
      throw new DataAccessVideoDataError();
    }
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
      response = await fetch('https://www.youtube.com/watch?v=' + videoId, {
        credentials: 'include'
      });
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

      const transcript = await this.fetchTranscript(playerResponse);

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

      if (videoId === videoId) {
        this.currentVideoData = videoData;
        this.isInitialDataFetch = false;
      }

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
}

export const videoDataService = new VideoDataService();
