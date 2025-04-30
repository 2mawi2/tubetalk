export abstract class VideoDataError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NoCaptionsVideoDataError extends VideoDataError {
  readonly code = 'NO_CAPTIONS' as const;
}

export class DataAccessVideoDataError extends VideoDataError {
  readonly code = 'DATA_ACCESS' as const;
}

export class ContentModerationVideoDataError extends VideoDataError {
  readonly code = 'CONTENT_MODERATION' as const;
  constructor(message?: string) {
    super(message || 'Content was flagged by moderation system');
  }
}

export class TokenLimitExceededError extends VideoDataError {
  readonly code = 'TOKEN_LIMIT_EXCEEDED' as const;
  constructor() {
    super('Video is too long to process. Support for longer videos coming soon.');
  }
} 