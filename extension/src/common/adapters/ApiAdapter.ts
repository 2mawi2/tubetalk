export interface ImageUrl {
  url: string;
  detail?: 'auto' | 'low' | 'high';
}

export interface MessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
    detail?: 'auto' | 'low' | 'high';
  };
  cache_control?: {
    type: 'ephemeral';
  };
}

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | MessageContent[];
  name?: string;
  tool_call_id?: string;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
    image: string;
    request: string;
  };
}

export interface ApiAdapter {
  generateStreamResponse(
    context: ConversationMessage[], 
    signal?: AbortSignal
  ): Promise<ReadableStreamDefaultReader<Uint8Array> | null>;

  fetchAvailableModels(): Promise<OpenRouterModel[]>;
}

export class OpenRouterApiAdapter implements ApiAdapter {
  private retryCount = 0;
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  constructor(
    private apiKey: string,
    private getModelPreferences: () => Promise<string[]>
  ) {}

  private transformStringToMessageContent(message: ConversationMessage): ConversationMessage {
    if (typeof message.content === 'string') {
      return {
        ...message,
        content: [{
          type: 'text',
          text: message.content
        }]
      };
    } else if (Array.isArray(message.content)) {
      return {
        ...message,
        content: message.content
      };
    }
    return message;
  }

  private shouldTransformMessage(message: ConversationMessage, index: number, messages: ConversationMessage[]): boolean {
    if (message.role === 'system') {
      return true;
    }
    
    if (message.role === 'user') {
      const previousUserMessages = messages.slice(0, index).filter(m => m.role === 'user');
      return previousUserMessages.length === 0;
    }
    
    return false;
  }

  async fetchAvailableModels(): Promise<OpenRouterModel[]> {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': window.location.href,
        'X-Title': 'YouTube Transcript Summarizer'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch models');
    }

    const data = await response.json();
    return data.data;
  }

  async generateStreamResponse(
    context: ConversationMessage[], 
    signal?: AbortSignal
  ): Promise<ReadableStreamDefaultReader<Uint8Array> | null> {
    try {
      if (!this.apiKey && this.retryCount < this.maxRetries) {
        this.retryCount++;
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.generateStreamResponse(context, signal);
      }

      const modelPreferences = await this.getModelPreferences();

      const transformedContext = context.map((msg, index) => 
        this.shouldTransformMessage(msg, index, context) 
          ? this.transformStringToMessageContent(msg) 
          : msg
      );

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': window.location.href,
          'X-Title': 'YouTube Transcript Summarizer'
        },
        body: JSON.stringify(this.buildOpenRouterBody(modelPreferences, transformedContext)),
        signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        let errorMessage = 'API error: ';
        
        if (errorData?.error?.message) {
          if (errorData.error.message.includes('max_tokens limit exceeded') && 
              errorData.error.message.includes('https://openrouter.ai/credits')) {
            errorMessage = 'The OpenRouter account needs more credits. Please visit https://openrouter.ai/credits to add more credits.';
          } else if (errorData.error.code === 402 || errorData.error.message.includes('More credits are required')) {
            errorMessage = 'Insufficient credits. Visit https://openrouter.ai/credits to upgrade your account.';
          } else {
            errorMessage += errorData.error.message;
          }
        } else if (response.status === 401) {
          errorMessage = 'Invalid API key. Please check your API key and try again.';
        } else if (response.status === 429) {
          errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
        } else if (response.status === 402) {
          errorMessage = 'More credits required. Upgrade at https://openrouter.ai/credits.';
        } else {
          errorMessage += `${response.status} ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      if (!response.body) return null;

      const transformedStream = this.transformStreamForErrors(response.body);
      return transformedStream.getReader();

    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('API request aborted');
        return null;
      }
      console.error('OpenAI API Error:', error);
      throw error;
    }
  }

  private buildOpenRouterBody(modelPreferences: string[], transformedContext: ConversationMessage[]) {
    const body: Record<string, any> = {
      models: modelPreferences,
      route: 'fallback',
      messages: transformedContext.map(msg => ({
        role: msg.role,
        content: msg.content,
        ...(msg.name && { name: msg.name }),
        ...(msg.tool_call_id && { tool_call_id: msg.tool_call_id })
      })),
      max_tokens: 3000,
      stream: true
    };

    const primary = modelPreferences[0] || '';
    const isOpenAI = primary.startsWith('openai/');
    const bare = isOpenAI ? primary.replace('openai/', '') : primary;
    const isReasoningFamily = bare.startsWith('gpt-5') || bare.startsWith('o1') || bare.startsWith('o2') || bare.startsWith('o3') || bare.startsWith('o4');

    if (isReasoningFamily) {
      
      body.reasoning = { effort: 'low' };
      
    } else {
      body.temperature = 0.1;
    }

    return body;
  }

  private transformStreamForErrors(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
    const textDecoder = new TextDecoder();
    const textEncoder = new TextEncoder();

    return new ReadableStream({
      async start(controller) {
        const reader = body.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
              break;
            }
            
            const chunks = textDecoder.decode(value).split('\n');
            for (const chunk of chunks) {
              if (!chunk.trim()) continue;

              if (chunk.startsWith('data: ')) {
                const jsonStr = chunk.replace('data: ', '').trim();
                if (jsonStr === '[DONE]') {
                  controller.close();
                  return;
                }

                try {
                  const data = JSON.parse(jsonStr);
                  if (data.error) {
                    const errorMsg = data.error.message || 'Unknown error during streaming';
                    controller.error(new Error(errorMsg));
                    return;
                  }
                  // Re-enqueue the original data line if no error
                  controller.enqueue(textEncoder.encode(`data: ${jsonStr}\n`));
                } catch (error) {
                  controller.error(new Error('Failed to parse stream data'));
                  return;
                }
              } else {
                // Pass through non-data lines
                controller.enqueue(textEncoder.encode(`${chunk}\n`));
              }
            }
          }
        } catch (error) {
          controller.error(error);
        }
      }
    });
  }
} 