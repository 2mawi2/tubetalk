import type { VideoData } from '../../common/types/VideoData';

export class VideoDataBuilder {
  private videoId = 'test-video-id';
  private title = 'Test Video';
  private description = 'Test Description';
  private transcript = 'Test Transcript';
  private timestamp = Date.now();

  public static create(): VideoDataBuilder {
    return new VideoDataBuilder();
  }

  public withVideoId(videoId: string): VideoDataBuilder {
    this.videoId = videoId;
    return this;
  }

  public withTitle(title: string): VideoDataBuilder {
    this.title = title;
    return this;
  }

  public withDescription(description: string): VideoDataBuilder {
    this.description = description;
    return this;
  }

  public withTranscript(transcript: string): VideoDataBuilder {
    this.transcript = transcript;
    return this;
  }

  public withTimestamp(timestamp: number): VideoDataBuilder {
    this.timestamp = timestamp;
    return this;
  }

  public build(): VideoData {
    return {
      videoId: this.videoId,
      title: this.title,
      description: this.description,
      transcript: this.transcript,
      timestamp: this.timestamp
    };
  }
} 