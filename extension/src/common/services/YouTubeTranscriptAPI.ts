export interface YouTubeAPIRequestConfig {
  videoId: string;
  authHeader: string;
  visitorData?: string;
  signal?: AbortSignal;
}

export interface YouTubeAPIResponse {
  segments: any[];
}

export function buildYouTubeAPIPayload(config: YouTubeAPIRequestConfig) {
  return {
    context: {
      client: {
        clientName: 'WEB'
      },
      request: {
        useSsl: true
      }
    },
    params: btoa(`\x0a\x0b${config.videoId}\x12\x12CgNhc3ISAmVuGgA%3D\x18\x01*3engagement-panel-searchable-transcript-search-panel0\x008\x01@\x01`)
  };
}

export function buildYouTubeAPIHeaders(authHeader: string) {
  return {
    'Content-Type': 'application/json',
    'Authorization': authHeader
  };
}

export async function fetchYouTubeTranscript(config: YouTubeAPIRequestConfig): Promise<YouTubeAPIResponse> {
  const payload = buildYouTubeAPIPayload(config);
  const headers = buildYouTubeAPIHeaders(config.authHeader);

  const response = await fetch('https://www.youtube.com/youtubei/v1/get_transcript?prettyPrint=false', {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(payload),
    signal: config.signal
  });

  if (!response.ok) {
    throw new Error(`YouTube API failed with status: ${response.status}`);
  }

  const data = await response.json();
  
  const segments = data?.actions?.[0]?.updateEngagementPanelAction?.content?.transcriptRenderer?.content?.transcriptSearchPanelRenderer?.body?.transcriptSegmentListRenderer?.initialSegments;
  
  if (!segments || segments.length === 0) {
    throw new Error('No transcript segments found in API response');
  }

  return { segments };
}