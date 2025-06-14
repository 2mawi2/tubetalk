import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { videoDataService } from './VideoDataService';
import { NoCaptionsVideoDataError, DataAccessVideoDataError, TokenLimitExceededError } from '../errors/VideoDataError';
import { getEncoding } from 'js-tiktoken';
import * as YouTubeTranscriptAPI from './YouTubeTranscriptAPI';

// Mock js-tiktoken
vi.mock('js-tiktoken', () => ({
  getEncoding: vi.fn(() => ({
    encode: vi.fn((text) => new Array(text.length)), // Mock that returns array with length equal to text length
  }))
}));

// Mock YouTubeTranscriptAPI
vi.mock('./YouTubeTranscriptAPI', () => ({
  fetchYouTubeTranscript: vi.fn()
}));

vi.mock('../translations', () => ({
  getMessage: vi.fn((key: string) => {
    const messages: Record<string, string> = {
      noTranscriptMessage: 'No transcripts available for this video. Please try a different video.',
      dataAccessError: 'Sorry, I cannot access the video transcript at the moment. Please try again.',
      tokenLimitExceededError: 'This video is too long to process at the moment. Support for longer videos is coming soon.'
    };
    return messages[key as keyof typeof messages] || key;
  })
}));

describe('VideoDataService', () => {
  let originalWindowYt: any;

  beforeEach(() => {
    vi.clearAllMocks();
    videoDataService.resetState();
    originalWindowYt = (window as any).ytInitialPlayerResponse;
    delete (window as any).ytInitialPlayerResponse;
    
    // Mock document.cookie for SAPISID
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: 'SAPISID=mock-sapisid-value; other=value'
    });
    
    // Mock crypto.subtle for authentication
    Object.defineProperty(global, 'crypto', {
      value: {
        subtle: {
          digest: vi.fn().mockResolvedValue(new ArrayBuffer(20))
        }
      },
      writable: true
    });
    
    // Mock window.ytcfg
    (window as any).ytcfg = {
      get: vi.fn().mockReturnValue('mock-visitor-data')
    };
    
    // Mock new API to fail by default - tests can override this
    vi.mocked(YouTubeTranscriptAPI.fetchYouTubeTranscript).mockRejectedValue(
      new Error('New API failed')
    );
    
    // Mock DOM extraction to fail by default - it's hard to test in unit tests
    vi.spyOn(videoDataService as any, 'fetchTranscriptFromDOM').mockRejectedValue(
      new Error('DOM extraction failed')
    );
  });

  afterEach(() => {
    (window as any).ytInitialPlayerResponse = originalWindowYt;
    vi.restoreAllMocks();
  });

  it('should use ytInitialPlayerResponse from window if available and matching videoId', async () => {

    (window as any).ytInitialPlayerResponse = {
      videoDetails: {
        videoId: 'test-window',
        title: 'Window Video',
        shortDescription: 'Window Desc'
      },
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks: [{
            baseUrl: 'https://example.com/captions',
            languageCode: 'en',
            kind: 'asr'
          }]
        }
      }
    };

    // Mock legacy API to succeed
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({
        events: [
          { tStartMs: 0, segs: [{ utf8: 'Hello from window' }] }
        ]
      }))
    });

    const data = await videoDataService.fetchVideoData('test-window');
    expect(data.title).toBe('Window Video');
    expect(data.description).toBe('Window Desc');
    expect(data.transcript).toContain('Hello from window');
  });

  it('should fallback to fetching HTML if window data is not set', async () => {

    const htmlResponse = `
      <html>
        <body>
          <script>
            var ytInitialPlayerResponse = {
              "videoDetails": {
                "title": "HTML Video",
                "shortDescription": "HTML Desc",
                "videoId": "test-html"
              },
              "captions": {
                "playerCaptionsTracklistRenderer": {
                  "captionTracks": [{
                    "baseUrl": "https://example.com/htmlcaptions",
                    "languageCode": "en",
                    "kind": "asr"
                  }]
                }
              }
            };
          </script>
        </body>
      </html>
    `;

    global.fetch = vi.fn()
      // Fetching HTML
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(htmlResponse)
      })
      // Fetching transcript (legacy API)
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          events: [
            { tStartMs: 0, segs: [{ utf8: 'Hello from html' }] }
          ]
        }))
      });

    const data = await videoDataService.fetchVideoData('test-html');
    expect(data.title).toBe('HTML Video');
    expect(data.description).toBe('HTML Desc');
    expect(data.transcript).toContain('Hello from html');
  });

  it('should use new YouTube API when available', async () => {
    // Mock successful new API response
    vi.mocked(YouTubeTranscriptAPI.fetchYouTubeTranscript).mockResolvedValueOnce({
      segments: [{
        transcriptSegmentRenderer: {
          startMs: '1000',
          snippet: {
            runs: [{ text: 'Hello from new API' }]
          }
        }
      }]
    });

    (window as any).ytInitialPlayerResponse = {
      videoDetails: {
        videoId: 'test-new-api',
        title: 'New API Video',
        shortDescription: 'New API Desc'
      }
    };

    const data = await videoDataService.fetchVideoData('test-new-api');
    expect(data.title).toBe('New API Video');
    expect(data.transcript).toContain('Hello from new API');
  });

  it('should throw NoCaptionsVideoDataError if no captions available', async () => {

    (window as any).ytInitialPlayerResponse = {
      videoDetails: {
        videoId: 'no-captions',
        title: 'No captions',
        shortDescription: 'No caps desc'
      },
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks: []
        }
      }
    };

    await expect(videoDataService.fetchVideoData('no-captions'))
      .rejects
      .toThrow(NoCaptionsVideoDataError);
  });

  it('should throw DataAccessVideoDataError if transcript events are null', async () => {

    (window as any).ytInitialPlayerResponse = {
      videoDetails: {
        videoId: 'test-fail',
        title: 'Fail Video',
        shortDescription: 'Fail Desc'
      },
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks: [{
            baseUrl: 'https://example.com/failcaptions',
            languageCode: 'en',
            kind: 'asr'
          }]
        }
      }
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ events: null }))
    });

    await expect(videoDataService.fetchVideoData('test-fail'))
      .rejects
      .toThrow(DataAccessVideoDataError);
  });

  it('should handle network errors gracefully', async () => {
    // No window data, must fallback
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    await expect(videoDataService.fetchVideoData('net-err'))
      .rejects
      .toThrow(DataAccessVideoDataError);
  });

  it('should handle YouTube returning HTML instead of JSON for transcript (logged-in user issue)', async () => {

    (window as any).ytInitialPlayerResponse = {
      videoDetails: {
        videoId: 'html-transcript-response',
        title: 'Test Video',
        shortDescription: 'Test Desc'
      },
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks: [{
            baseUrl: 'https://example.com/captions',
            languageCode: 'en',
            kind: 'asr'
          }]
        }
      }
    };

    // Mock legacy API returning HTML
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<html>Login required</html>')
    });

    await expect(videoDataService.fetchVideoData('html-transcript-response'))
      .rejects
      .toThrow(DataAccessVideoDataError);
  });
});

describe('Token Limit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    videoDataService.resetState();
    
    // Mock new API to fail by default in token limit tests
    vi.mocked(YouTubeTranscriptAPI.fetchYouTubeTranscript).mockRejectedValue(
      new Error('New API failed')
    );
    
    // Mock DOM extraction to fail by default
    vi.spyOn(videoDataService as any, 'fetchTranscriptFromDOM').mockRejectedValue(
      new Error('DOM extraction failed')
    );
  });

  it('should throw TokenLimitExceededError when content exceeds token limit', async () => {
    // Create a very long transcript that will exceed the token limit
    const longTranscript = 'a'.repeat(200000); // This will result in 200k tokens with our mock

    (window as any).ytInitialPlayerResponse = {
      videoDetails: {
        videoId: 'long-video',
        title: 'Long Video',
        shortDescription: 'Test Description'
      },
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks: [{
            baseUrl: 'https://example.com/captions',
            languageCode: 'en',
            kind: 'asr'
          }]
        }
      }
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({
        events: [
          { tStartMs: 0, segs: [{ utf8: longTranscript }] }
        ]
      }))
    });

    await expect(videoDataService.fetchVideoData('long-video'))
      .rejects
      .toThrow(TokenLimitExceededError);
  });

  it('should process video when content is within token limit', async () => {
    // Create a transcript that's within the limit
    const shortTranscript = 'Hello, this is a short video.';

    (window as any).ytInitialPlayerResponse = {
      videoDetails: {
        videoId: 'short-video',
        title: 'Short Video',
        shortDescription: 'Test Description'
      },
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks: [{
            baseUrl: 'https://example.com/captions',
            languageCode: 'en',
            kind: 'asr'
          }]
        }
      }
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({
        events: [
          { tStartMs: 0, segs: [{ utf8: shortTranscript }] }
        ]
      }))
    });

    const data = await videoDataService.fetchVideoData('short-video');
    expect(data.transcript).toContain(shortTranscript);
  });

  it('should use fallback token counting when js-tiktoken fails', async () => {
    // Mock js-tiktoken to throw an error
    vi.mocked(getEncoding).mockImplementationOnce(() => {
      throw new Error('Tokenizer error');
    });

    const transcript = 'a'.repeat(512000); // This will exceed the limit with character-based fallback

    (window as any).ytInitialPlayerResponse = {
      videoDetails: {
        videoId: 'fallback-test',
        title: 'Fallback Test',
        shortDescription: 'Test Description'
      },
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks: [{
            baseUrl: 'https://example.com/captions',
            languageCode: 'en',
            kind: 'asr'
          }]
        }
      }
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({
        events: [
          { tStartMs: 0, segs: [{ utf8: transcript }] }
        ]
      }))
    });

    await expect(videoDataService.fetchVideoData('fallback-test'))
      .rejects
      .toThrow(TokenLimitExceededError);
  });
});

describe('Parallel Transcript Fetching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    videoDataService.resetState();
    
    // Mock document.cookie for SAPISID
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: 'SAPISID=mock-sapisid-value; other=value'
    });
    
    // Mock crypto.subtle for authentication
    Object.defineProperty(global, 'crypto', {
      value: {
        subtle: {
          digest: vi.fn().mockResolvedValue(new ArrayBuffer(20))
        }
      },
      writable: true
    });
    
    // Mock window.ytcfg
    (window as any).ytcfg = {
      get: vi.fn().mockReturnValue('mock-visitor-data')
    };
    
    // Mock DOM extraction to fail by default - it's hard to test in unit tests
    vi.spyOn(videoDataService as any, 'fetchTranscriptFromDOM').mockRejectedValue(
      new Error('DOM extraction failed')
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should race all transcript methods and use the first successful one', async () => {
    // Set up timing for different methods
    const newAPIDelay = 100;
    const legacyAPIDelay = 200;

    // Mock new API to succeed after delay
    vi.mocked(YouTubeTranscriptAPI.fetchYouTubeTranscript).mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, newAPIDelay));
      return {
        segments: [{
          transcriptSegmentRenderer: {
            startMs: '1000',
            snippet: {
              runs: [{ text: 'New API wins!' }]
            }
          }
        }]
      };
    });

    // Set up player response with caption tracks
    (window as any).ytInitialPlayerResponse = {
      videoDetails: {
        videoId: 'race-test',
        title: 'Race Test Video',
        shortDescription: 'Test Description'
      },
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks: [{
            baseUrl: 'https://example.com/captions',
            languageCode: 'en',
            kind: 'asr'
          }]
        }
      }
    };

    // Mock legacy API to succeed after longer delay
    global.fetch = vi.fn().mockImplementation(async (url) => {
      if (url.includes('captions')) {
        await new Promise(resolve => setTimeout(resolve, legacyAPIDelay));
        return {
          ok: true,
          text: () => Promise.resolve(JSON.stringify({
            events: [
              { tStartMs: 0, segs: [{ utf8: 'Legacy API wins!' }] }
            ]
          }))
        };
      }
      // For HTML fetch
      return {
        ok: true,
        text: () => Promise.resolve('<html></html>')
      };
    });

    const startTime = Date.now();
    const data = await videoDataService.fetchVideoData('race-test');
    const elapsed = Date.now() - startTime;

    // Should use new API result since it's fastest
    expect(data.transcript).toContain('New API wins!');
    // Should complete in approximately the new API delay time
    expect(elapsed).toBeLessThan(legacyAPIDelay);
  });

  it('should fall back to next method if first one fails', async () => {
    // Mock new API to fail immediately
    vi.mocked(YouTubeTranscriptAPI.fetchYouTubeTranscript).mockRejectedValue(
      new Error('New API failed')
    );

    (window as any).ytInitialPlayerResponse = {
      videoDetails: {
        videoId: 'fallback-test',
        title: 'Fallback Test Video',
        shortDescription: 'Test Description'
      },
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks: [{
            baseUrl: 'https://example.com/captions',
            languageCode: 'en',
            kind: 'asr'
          }]
        }
      }
    };

    // Mock legacy API to succeed
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({
        events: [
          { tStartMs: 0, segs: [{ utf8: 'Legacy API fallback success' }] }
        ]
      }))
    });

    const data = await videoDataService.fetchVideoData('fallback-test');
    expect(data.transcript).toContain('Legacy API fallback success');
  });

  it('should cancel other methods when one succeeds', async () => {
    let newAPICancelled = false;

    // Mock new API to take long time but check for cancellation
    vi.mocked(YouTubeTranscriptAPI.fetchYouTubeTranscript).mockImplementation(async (config) => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          resolve({
            segments: [{
              transcriptSegmentRenderer: {
                startMs: '1000',
                snippet: {
                  runs: [{ text: 'Should not see this' }]
                }
              }
            }]
          });
        }, 1000);

        // Listen for abort signal
        config.signal?.addEventListener('abort', () => {
          newAPICancelled = true;
          clearTimeout(timeout);
          reject(new Error('Request aborted'));
        });
      });
    });

    (window as any).ytInitialPlayerResponse = {
      videoDetails: {
        videoId: 'cancel-test',
        title: 'Cancel Test Video',
        shortDescription: 'Test Description'
      },
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks: [{
            baseUrl: 'https://example.com/captions',
            languageCode: 'en',
            kind: 'asr'
          }]
        }
      }
    };

    // Mock legacy API to succeed quickly
    global.fetch = vi.fn().mockImplementation(async (url, options) => {
      if (url.includes('captions')) {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            resolve({
              ok: true,
              text: () => Promise.resolve(JSON.stringify({
                events: [
                  { tStartMs: 0, segs: [{ utf8: 'Legacy API quick win' }] }
                ]
              }))
            });
          }, 50);

          // Listen for abort signal
          options?.signal?.addEventListener('abort', () => {
            clearTimeout(timeout);
            reject(new Error('Request aborted'));
          });
        });
      }
      return {
        ok: true,
        text: () => Promise.resolve('<html></html>')
      };
    });

    const data = await videoDataService.fetchVideoData('cancel-test');
    
    // Legacy API should win
    expect(data.transcript).toContain('Legacy API quick win');
    
    // Wait a bit to ensure cancellation propagated
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // New API should have been cancelled
    expect(newAPICancelled).toBe(true);
  });

  it('should handle all methods failing', async () => {
    // Mock all methods to fail
    vi.mocked(YouTubeTranscriptAPI.fetchYouTubeTranscript).mockRejectedValue(
      new Error('New API failed')
    );

    (window as any).ytInitialPlayerResponse = {
      videoDetails: {
        videoId: 'all-fail-test',
        title: 'All Fail Test Video',
        shortDescription: 'Test Description'
      },
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks: [{
            baseUrl: 'https://example.com/captions',
            languageCode: 'en',
            kind: 'asr'
          }]
        }
      }
    };

    // Mock legacy API to fail
    global.fetch = vi.fn().mockRejectedValue(new Error('Legacy API failed'));

    // Mock DOM extraction to fail (no document setup)
    await expect(videoDataService.fetchVideoData('all-fail-test'))
      .rejects
      .toThrow(DataAccessVideoDataError);
  });

  it('should handle request cancellation via cancelVideoDataRequest', async () => {
    // Mock new API to handle abort signals properly
    vi.mocked(YouTubeTranscriptAPI.fetchYouTubeTranscript).mockImplementation(
      (config) => new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          resolve({
            segments: [{
              transcriptSegmentRenderer: {
                startMs: '1000',
                snippet: {
                  runs: [{ text: 'Should not see this' }]
                }
              }
            }]
          });
        }, 5000);

        // Listen for abort signal
        config.signal?.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Request aborted'));
        });
      })
    );

    (window as any).ytInitialPlayerResponse = {
      videoDetails: {
        videoId: 'cancel-request-test',
        title: 'Cancel Request Test',
        shortDescription: 'Test Description'
      }
    };

    // Start the request but don't await it
    const requestPromise = videoDataService.fetchVideoData('cancel-request-test');

    // Cancel it after a short delay
    setTimeout(() => {
      videoDataService.cancelVideoDataRequest('cancel-request-test');
    }, 50);

    // Should throw due to cancellation
    await expect(requestPromise).rejects.toThrow();
  });

  it('should handle missing SAPISID cookie gracefully', async () => {
    // Remove SAPISID from cookie
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: 'other=value'
    });

    (window as any).ytInitialPlayerResponse = {
      videoDetails: {
        videoId: 'no-auth-test',
        title: 'No Auth Test',
        shortDescription: 'Test Description'
      },
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks: [{
            baseUrl: 'https://example.com/captions',
            languageCode: 'en',
            kind: 'asr'
          }]
        }
      }
    };

    // Legacy API should still work
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({
        events: [
          { tStartMs: 0, segs: [{ utf8: 'Works without auth' }] }
        ]
      }))
    });

    const data = await videoDataService.fetchVideoData('no-auth-test');
    expect(data.transcript).toContain('Works without auth');
  });
});
