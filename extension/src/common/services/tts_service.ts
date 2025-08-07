
export interface TtsHandle {
  stop: () => void;
  onEnded?: (cb: () => void) => void;
}

export interface TtsService {
  canSynthesize: boolean;
  speak: (text: string) => Promise<TtsHandle>;
}

class OpenAITtsService implements TtsService {
  private apiKey: string;
  private currentAudio: any | null = null;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  get canSynthesize(): boolean {
    return !!this.apiKey;
  }

  async speak(text: string): Promise<TtsHandle> {
    if (!this.apiKey) throw new Error('Missing API key');

    if (this.currentAudio) {
      try { this.currentAudio.pause(); } catch (e) {  }
      this.currentAudio = null;
    }

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        input: text,
        voice: 'alloy',
        format: 'mp3'
      })
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`TTS request failed: ${response.status} ${response.statusText} ${errText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    const audio = new (window as any).Audio(url);
    this.currentAudio = audio;
    audio.play().catch(() => {
      URL.revokeObjectURL(url);
      this.currentAudio = null;
    });

    let cleaned = false;
    const endedCallbacks: Array<() => void> = [];
    const notifyEnded = () => {
      for (const cb of endedCallbacks) {
        try { cb(); } catch (e) {  }
      }
    };

    const stop = () => {
      if (cleaned) return;
      cleaned = true;
      try { audio.pause(); } catch (e) {  }
      try { URL.revokeObjectURL(url); } catch (e) {  }
      if (this.currentAudio === audio) this.currentAudio = null;
      notifyEnded();
    };

    audio.addEventListener('ended', () => {
      stop();
    });
    audio.addEventListener('error', () => {
      stop();
    });

    const onEnded = (cb: () => void) => {
      endedCallbacks.push(cb);
    };

    return { stop, onEnded };
  }
}

export function createTtsService(provider: 'openai' | 'openrouter' | undefined, apiKey?: string | null): TtsService | null {
  if (provider === 'openai' && apiKey) {
    return new OpenAITtsService(apiKey);
  }
  return null;
}


