import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { videoDataService } from './VideoDataService';
import { NoCaptionsVideoDataError, DataAccessVideoDataError, TokenLimitExceededError } from '../errors/VideoDataError';
import { getEncoding } from 'js-tiktoken';

// Mock js-tiktoken
vi.mock('js-tiktoken', () => ({
  getEncoding: vi.fn(() => ({
    encode: vi.fn((text) => new Array(text.length)), // Mock that returns array with length equal to text length
  }))
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
  });

  afterEach(() => {
    (window as any).ytInitialPlayerResponse = originalWindowYt;
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

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        events: [
          { tStartMs: 0, segs: [{ utf8: 'Hello from window' }] }
        ]
      })
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
      // Fetching transcript
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          events: [
            { tStartMs: 0, segs: [{ utf8: 'Hello from html' }] }
          ]
        })
      });

    const data = await videoDataService.fetchVideoData('test-html');
    expect(data.title).toBe('HTML Video');
    expect(data.description).toBe('HTML Desc');
    expect(data.transcript).toContain('Hello from html');
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

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ events: null })
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

    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.reject(new SyntaxError('Unexpected token < in JSON at position 0')) 
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

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        events: [
          { tStartMs: 0, segs: [{ utf8: longTranscript }] }
        ]
      })
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

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        events: [
          { tStartMs: 0, segs: [{ utf8: shortTranscript }] }
        ]
      })
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

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        events: [
          { tStartMs: 0, segs: [{ utf8: transcript }] }
        ]
      })
    });

    await expect(videoDataService.fetchVideoData('fallback-test'))
      .rejects
      .toThrow(TokenLimitExceededError);
  });
});
