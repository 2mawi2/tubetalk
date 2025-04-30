import { seekToTimestamp, secondsToTimestamp, timestampToSeconds, convertTimestampToSeconds, convertTimestampsToLinks } from './timeUtils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('timeUtils', () => {
  describe('seekToTimestamp', () => {
    let mockVideo: { 
      currentTime: number; 
      play: any;
    };
    let querySelectorSpy: ReturnType<typeof vi.spyOn>;
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
    let originalNodeEnv: string | undefined;

    beforeEach(() => {
      originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      mockVideo = {
        currentTime: 0,
        play: vi.fn().mockResolvedValue(undefined),
      };

      querySelectorSpy = vi.spyOn(document, 'querySelector');
      querySelectorSpy.mockReturnValue(mockVideo as unknown as HTMLVideoElement);

      consoleErrorSpy = vi.spyOn(console, 'error');
      consoleErrorSpy.mockImplementation(() => {});
    });

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
      vi.restoreAllMocks();
    });

    it('should seek to correct time for MM:SS format', () => {
      seekToTimestamp('05:30');
      expect(mockVideo.currentTime).toBe(330);
      expect(mockVideo.play).toHaveBeenCalled();
    });

    it('should seek to correct time for HH:MM:SS format', () => {
      seekToTimestamp('01:05:30');
      expect(mockVideo.currentTime).toBe(3930);
      expect(mockVideo.play).toHaveBeenCalled();
    });

    it('should handle missing video element gracefully', () => {
      querySelectorSpy.mockReturnValue(null);
      seekToTimestamp('05:30');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(mockVideo.play).not.toHaveBeenCalled();
    });

    it('should handle play() rejection gracefully', () => {
      mockVideo.play.mockRejectedValueOnce(new Error('Autoplay prevented'));
      seekToTimestamp('05:30');
      expect(mockVideo.currentTime).toBe(330);
      expect(mockVideo.play).toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('secondsToTimestamp', () => {
    it('should convert seconds to MM:SS format when less than an hour', () => {
      expect(secondsToTimestamp(90)).toBe('01:30');
      expect(secondsToTimestamp(45)).toBe('00:45');
      expect(secondsToTimestamp(3599)).toBe('59:59');
    });

    it('should convert seconds to HH:MM:SS format when an hour or more', () => {
      expect(secondsToTimestamp(3600)).toBe('01:00:00');
      expect(secondsToTimestamp(7323)).toBe('02:02:03');
    });

    it('should handle zero seconds', () => {
      expect(secondsToTimestamp(0)).toBe('00:00');
    });
  });

  describe('timestampToSeconds', () => {
    it('should convert MM:SS format to seconds', () => {
      expect(timestampToSeconds('05:30')).toBe(330);
      expect(timestampToSeconds('00:45')).toBe(45);
      expect(timestampToSeconds('59:59')).toBe(3599);
    });

    it('should convert HH:MM:SS format to seconds', () => {
      expect(timestampToSeconds('01:00:00')).toBe(3600);
      expect(timestampToSeconds('02:02:03')).toBe(7323);
    });
  });

  describe('convertTimestampToSeconds', () => {
    it('should convert MM:SS format correctly', () => {
      expect(convertTimestampToSeconds('01:30')).toBe(90);
      expect(convertTimestampToSeconds('00:45')).toBe(45);
    });

    it('should convert HH:MM:SS format correctly', () => {
      expect(convertTimestampToSeconds('01:30:45')).toBe(5445);
    });

    it('should handle invalid formats', () => {
      expect(convertTimestampToSeconds('99:99')).toBeNull();
      expect(convertTimestampToSeconds('invalid')).toBeNull();
    });
  });

  describe('convertTimestampsToLinks', () => {
    const mockVideoId = 'abc123';

    it('should convert MM:SS format timestamps to links', () => {
      const input = 'Check this part §[01:30]§ for more info';
      const expected = `Check this part [1:30](https://www.youtube.com/watch?v=${mockVideoId}&t=90s) for more info`;
      expect(convertTimestampsToLinks(input, mockVideoId, false)).toBe(expected);
    });

    it('should convert HH:MM:SS format timestamps to links', () => {
      const input = 'Long video section §[01:30:45]§ explains it';
      const expected = `Long video section [1:30:45](https://www.youtube.com/watch?v=${mockVideoId}&t=5445s) explains it`;
      expect(convertTimestampsToLinks(input, mockVideoId, false)).toBe(expected);
    });

    it('should handle multiple timestamps in the same content', () => {
      const input = 'Check §[01:30]§ and §[02:45]§ for details';
      const result = convertTimestampsToLinks(input, mockVideoId, false);
      expect(result).toContain(`[1:30](https://www.youtube.com/watch?v=${mockVideoId}&t=90s)`);
      expect(result).toContain(`[2:45](https://www.youtube.com/watch?v=${mockVideoId}&t=165s)`);
    });

    it('should handle invalid timestamp formats', () => {
      const input = 'Bad format §[99:99]§ should be ignored';
      const result = convertTimestampsToLinks(input, mockVideoId, false);
      expect(result).not.toContain('https://www.youtube.com/watch');
      expect(result).toContain('[99:99]');
    });

    it('should handle missing videoId', () => {
      const input = 'Check this §[01:30]§ out';
      const result = convertTimestampsToLinks(input, undefined, false);
      expect(result).toContain('[1:30]');
      expect(result).not.toContain('https://www.youtube.com/watch');
    });

    it('should generate HTML links when isHtml is true', () => {
      const input = 'Check this part §[01:30]§ for more info';
      const result = convertTimestampsToLinks(input, mockVideoId, true);
      expect(result).toContain(`<a href="https://www.youtube.com/watch?v=${mockVideoId}&t=90s"`);
      expect(result).toContain('style="color: #0066cc; text-decoration: underline;"');
    });
  });
});     