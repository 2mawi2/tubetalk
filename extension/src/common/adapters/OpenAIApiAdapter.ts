import { ApiAdapter, ConversationMessage, OpenRouterModel } from './ApiAdapter';

export class OpenAIApiAdapter implements ApiAdapter {
  private retryCount = 0;
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  // Cache for fetched models
  private cachedModels: OpenRouterModel[] | null = null;
  private lastFetchTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(
    private apiKey: string,
    private organizationId?: string,
    private getModelPreferences?: () => Promise<string[]>
  ) {}

  async fetchAvailableModels(): Promise<OpenRouterModel[]> {
    // Check cache first
    const now = Date.now();
    if (this.cachedModels && (now - this.lastFetchTime) < this.CACHE_DURATION) {
      return this.cachedModels;
    }

    try {
      if (!this.apiKey) {
        throw new Error('OpenAI API key is required to fetch models');
      }

      const headers: Record<string, string> = {
        'Authorization': `Bearer ${this.apiKey}`
      };

      if (this.organizationId) {
        headers['OpenAI-Organization'] = this.organizationId;
      }

      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        let errorMessage = 'Failed to fetch OpenAI models: ';
        
        if (errorData?.error?.message) {
          errorMessage += errorData.error.message;
        } else if (response.status === 401) {
          errorMessage = 'Invalid API key. Please check your OpenAI API key.';
        } else {
          errorMessage += `${response.status} ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Filter and transform OpenAI models to match OpenRouterModel interface
      const chatModels = data.data
        .filter((model: any) => this.isTextChatModel(model))
        .map((model: any) => ({
          id: model.id,
          name: this.formatModelName(model.id),
          context_length: this.getContextLength(model.id),
          description: this.getModelDescription(model.id),
          pricing: { 
            prompt: '0', 
            completion: '0', 
            image: '0', 
            request: '0' 
          }
        }));

      // Sort by capability (latest and most capable models first)
      const sortedModels = chatModels.sort((a: OpenRouterModel, b: OpenRouterModel) => {
        const order = [
          'o3-pro',       // Most advanced reasoning models
          'o3',
          'o3-mini',
          'o4-mini',
          'o1-preview',
          'o1-mini',
          'gpt-4.1',      // Latest GPT-4.1 family (default)
          'gpt-4.1-mini',
          'gpt-4.1-nano',
          'gpt-4o-audio', // GPT-4o family
          'gpt-4o',
          'gpt-4o-mini-audio',
          'gpt-4o-mini',
          'gpt-4-turbo',  // Legacy models (kept for compatibility)
          'gpt-4',
          'gpt-3.5-turbo',
          'gpt-3.5-turbo-instruct'
        ];
        const aIndex = order.findIndex(prefix => a.id.startsWith(prefix));
        const bIndex = order.findIndex(prefix => b.id.startsWith(prefix));
        
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });

      // Cache the results
      this.cachedModels = sortedModels;
      this.lastFetchTime = now;

      return sortedModels;
    } catch (error) {
      console.error('Error fetching OpenAI models:', error);
      // Return a fallback list if API fails
      return this.getFallbackModels();
    }
  }

  private formatModelName(modelId: string): string {
    const nameMap: Record<string, string> = {
      'gpt-4.1': 'GPT-4.1',
      'gpt-4.1-mini': 'GPT-4.1 Mini',
      'gpt-4.1-nano': 'GPT-4.1 Nano',
      'gpt-4o': 'GPT-4o',
      'gpt-4o-mini': 'GPT-4o Mini',
      'gpt-4o-audio': 'GPT-4o Audio',
      'gpt-4o-mini-audio': 'GPT-4o Mini Audio',
      'gpt-4-turbo': 'GPT-4 Turbo',
      'gpt-4': 'GPT-4',
      'gpt-3.5-turbo': 'GPT-3.5 Turbo',
      'gpt-3.5-turbo-instruct': 'GPT-3.5 Turbo Instruct',
      'o1-preview': 'o1 Preview',
      'o1-mini': 'o1 Mini',
      'o3-mini': 'o3 Mini',
      'o3': 'o3',
      'o3-pro': 'o3 Pro',
      'o4-mini': 'o4 Mini'
    };
    
    return nameMap[modelId] || modelId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private getContextLength(modelId: string): number {
    const contextMap: Record<string, number> = {
      // GPT-4.1 family (1M context)
      'gpt-4.1': 1000000,
      'gpt-4.1-mini': 1000000,
      'gpt-4.1-nano': 1000000,
      // GPT-4o family
      'gpt-4o': 128000,
      'gpt-4o-mini': 128000,
      'gpt-4o-audio': 128000,
      'gpt-4o-mini-audio': 128000,
      // Legacy GPT-4 family
      'gpt-4-turbo': 128000,
      'gpt-4-turbo-preview': 128000,
      'gpt-4': 8192,
      // GPT-3.5 family
      'gpt-3.5-turbo': 16385,
      'gpt-3.5-turbo-16k': 16385,
      'gpt-3.5-turbo-instruct': 4096,
      // Reasoning models
      'o1-preview': 128000,
      'o1-mini': 128000,
      'o3-mini': 128000,
      'o3': 200000,
      'o3-pro': 200000,
      'o4-mini': 128000
    };
    
    return contextMap[modelId] || 4096;
  }

  private getModelDescription(modelId: string): string {
    const descMap: Record<string, string> = {
      // GPT-4.1 family
      'gpt-4.1': 'Latest and most capable model with 1M context',
      'gpt-4.1-mini': 'Fast and affordable with GPT-4.1 intelligence',
      'gpt-4.1-nano': 'Fastest model for classification and completion',
      // GPT-4o family
      'gpt-4o': 'Multimodal AI trained on text, images, and audio',
      'gpt-4o-mini': 'Entry-level multimodal model',
      'gpt-4o-audio': 'Audio-enabled version of GPT-4o',
      'gpt-4o-mini-audio': 'Affordable audio model',
      // Legacy models
      'gpt-4-turbo': 'Previous GPT-4 with vision capabilities',
      'gpt-4-turbo-preview': 'Preview of GPT-4 Turbo features',
      'gpt-4': 'Original GPT-4 model',
      'gpt-3.5-turbo': 'Fast and efficient model for basic tasks',
      'gpt-3.5-turbo-16k': 'GPT-3.5 with extended context window',
      'gpt-3.5-turbo-instruct': 'Completion model for specific use cases',
      // Reasoning models
      'o1-preview': 'Advanced reasoning model for complex problems',
      'o1-mini': 'Faster reasoning model for STEM applications',
      'o3-mini': 'Efficient reasoning model with enhanced capabilities',
      'o3': 'Advanced reasoning model for complex tasks',
      'o3-pro': 'Extended reasoning for maximum reliability',
      'o4-mini': 'Latest mini reasoning model'
    };
    
    return descMap[modelId] || 'OpenAI language model';
  }

  private isTextChatModel(model: any): boolean {
    const modelId = model.id.toLowerCase();
    
    // First, check for obvious exclusions based on model purpose
    if (this.isNonTextModel(modelId)) {
      return false;
    }
    
    // Then check if it's a chat-capable model
    return this.isChatCapableModel(modelId);
  }

  private isNonTextModel(modelId: string): boolean {
    // Patterns that clearly indicate non-text models
    const nonTextPatterns = [
      'whisper',           // audio transcription
      'dall-e',            // image generation  
      'gpt-image',         // image generation
      'text-embedding',    // text embeddings
      'text-moderation',   // content moderation
      'text-similarity',   // similarity models
      'code-search',       // code search
      'text-search',       // text search
      'edit-',             // text editing models
      'insert-',           // text insertion models
    ];
    
    return nonTextPatterns.some(pattern => modelId.includes(pattern));
  }

  private isChatCapableModel(modelId: string): boolean {
    // Known chat model patterns (more flexible for future models)
    const chatModelIndicators = [
      // GPT family chat models
      { pattern: /^gpt-[3-9]/, exclude: ['instruct', 'davinci', 'curie', 'babbage', 'ada'] },
      // Reasoning models (o1, o3, future versions)
      { pattern: /^o[1-9]/, exclude: [] },
      // Future GPT generations
      { pattern: /^gpt-[1-9][0-9]/, exclude: ['instruct'] },
    ];
    
    for (const indicator of chatModelIndicators) {
      if (indicator.pattern.test(modelId)) {
        // Check if it's not excluded
        const isExcluded = indicator.exclude.some(excludePattern => 
          modelId.includes(excludePattern)
        );
        
        if (!isExcluded && !this.isDeprecatedVersion(modelId)) {
          return true;
        }
      }
    }
    
    return false;
  }

  private isDeprecatedVersion(modelId: string): boolean {
    // Common deprecated version patterns (MMDD or MMYY format)
    const deprecatedPatterns = [
      /\b0[1-9][0-9][0-9]\b/,   // Matches 0125, 0301, 0314, 0425, etc.
      /\b1[0-2][0-9][0-9]\b/,   // Matches 1106, 1201, etc.
      /-\d{4}-/,                // Matches any -YYYY- pattern like -2024-
    ];
    
    return deprecatedPatterns.some(pattern => pattern.test(modelId));
  }

  private getFallbackModels(): OpenRouterModel[] {
    // Fallback list in case API is unavailable
    return [
      {
        id: 'gpt-4.1',
        name: 'GPT-4.1',
        context_length: 1000000,
        description: 'Latest and most capable model with 1M context',
        pricing: { prompt: '0', completion: '0', image: '0', request: '0' }
      },
      {
        id: 'gpt-4.1-mini',
        name: 'GPT-4.1 Mini',
        context_length: 1000000,
        description: 'Fast and affordable with GPT-4.1 intelligence',
        pricing: { prompt: '0', completion: '0', image: '0', request: '0' }
      },
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        context_length: 128000,
        description: 'Multimodal AI trained on text, images, and audio',
        pricing: { prompt: '0', completion: '0', image: '0', request: '0' }
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        context_length: 128000,
        description: 'Entry-level multimodal model',
        pricing: { prompt: '0', completion: '0', image: '0', request: '0' }
      }
    ];
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

      if (!this.apiKey) {
        throw new Error('OpenAI API key is required');
      }

      // Transform messages to OpenAI format (remove model prefixes if any)
      const messages = context.map(msg => ({
        role: msg.role,
        content: msg.content,
        ...(msg.name && { name: msg.name }),
        ...(msg.tool_call_id && { tool_call_id: msg.tool_call_id })
      }));

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      };

      // Add organization ID if provided
      if (this.organizationId) {
        headers['OpenAI-Organization'] = this.organizationId;
      }

      const preferredModel = await this.pickPreferredModel();

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: preferredModel,
          messages,
          max_tokens: 3000,
          temperature: 0.1,
          stream: true
        }),
        signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        let errorMessage = 'OpenAI API error: ';
        
        if (errorData?.error?.message) {
          if (errorData.error.type === 'insufficient_quota') {
            errorMessage = 'Your OpenAI account has insufficient quota. Please check your billing details at https://platform.openai.com/account/billing';
          } else if (errorData.error.type === 'invalid_api_key') {
            errorMessage = 'Invalid OpenAI API key. Please check your API key and try again.';
          } else if (errorData.error.type === 'model_not_found') {
            errorMessage = `Model not found: ${errorData.error.message}`;
          } else {
            errorMessage += errorData.error.message;
          }
        } else if (response.status === 401) {
          errorMessage = 'Invalid API key. Please check your OpenAI API key and try again.';
        } else if (response.status === 429) {
          errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
        } else if (response.status === 402) {
          errorMessage = 'Payment required. Please check your OpenAI billing at https://platform.openai.com/account/billing';
        } else if (response.status === 404) {
          errorMessage = 'Model not found. Please ensure you have access to the requested model.';
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
        console.log('OpenAI API request aborted');
        return null;
      }
      console.error('OpenAI API Error:', error);
      throw error;
    }
  }

  private async pickPreferredModel(): Promise<string> {
    
    const fallback = 'gpt-4.1';
    try {
      const fromPrefs = (await this.getModelPreferences?.()) || [];
      
      const first = fromPrefs.find(m => !m.includes('/'));
      return first || fallback;
    } catch {
      return fallback;
    }
  }

  private transformStreamForErrors(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
    const textDecoder = new TextDecoder();
    const textEncoder = new TextEncoder();

    return new ReadableStream({
      async start(controller) {
        const reader = body.getReader();
        let buffer = '';
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
              break;
            }
            
            // Decode and add to buffer
            buffer += textDecoder.decode(value, { stream: true });
            
            // Process complete lines
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer
            
            for (const line of lines) {
              if (!line.trim()) continue;

              if (line.startsWith('data: ')) {
                const jsonStr = line.replace('data: ', '').trim();
                if (jsonStr === '[DONE]') {
                  controller.close();
                  return;
                }

                try {
                  const data = JSON.parse(jsonStr);
                  
                  // Check for errors in the stream
                  if (data.error) {
                    let errorMsg = 'Error during streaming: ';
                    if (data.error.type === 'insufficient_quota') {
                      errorMsg = 'Insufficient quota. Check your OpenAI billing.';
                    } else if (data.error.type === 'invalid_api_key') {
                      errorMsg = 'Invalid API key during streaming.';
                    } else {
                      errorMsg += data.error.message || 'Unknown error';
                    }
                    controller.error(new Error(errorMsg));
                    return;
                  }
                  
                  // Re-enqueue the original data line if no error
                  controller.enqueue(textEncoder.encode(`data: ${jsonStr}\n`));
                } catch (error) {
                  // If JSON parsing fails, it might be a partial message, pass it through
                  controller.enqueue(textEncoder.encode(`${line}\n`));
                }
              } else {
                // Pass through non-data lines
                controller.enqueue(textEncoder.encode(`${line}\n`));
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