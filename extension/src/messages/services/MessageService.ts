import { videoDataService } from '../../common/services/VideoDataService';
import { PromptBuilder } from '../utils/promptBuilder';
import type { ApiAdapter, ConversationMessage } from '../../common/adapters/ApiAdapter';
import type { PromptAdapter } from '../../common/adapters/PromptAdapter';
import { ContentModerationVideoDataError } from '../../common/errors/VideoDataError';
import type { MessageContent } from '../components/Message';
import { cleanStreamedContent } from '../utils/streamCleaner';

export class MessageService {
  private apiAdapter: ApiAdapter;
  private promptAdapter: PromptAdapter;
  private storageAdapter: any;
  private streamController: AbortController | null = null;

  constructor(
    apiAdapter: ApiAdapter,
    promptAdapter: PromptAdapter,
    storageAdapter: any
  ) {
    this.apiAdapter = apiAdapter;
    this.promptAdapter = promptAdapter;
    this.storageAdapter = storageAdapter;
  }

  public cleanup() {
    if (this.streamController) {
      this.streamController.abort();
      this.streamController = null;
    }
  }

  public initializeStream(): AbortController {
    this.cleanup();
    this.streamController = new AbortController();
    return this.streamController;
  }

  public async initializeChat(videoId: string): Promise<{
    initialContext: ConversationMessage[];
    reader: ReadableStreamDefaultReader<Uint8Array>;
  }> {
    const videoData = await videoDataService.fetchVideoData(videoId);

    if (!videoData.title) {
      throw new Error('Title is required');
    }

    const prompts = await this.promptAdapter.getPrompts();
    const selectedSummaryLanguage = await this.storageAdapter?.getSelectedSummaryLanguage();
    const promptBuilder = new PromptBuilder(prompts, selectedSummaryLanguage);

    const showSponsored = await this.storageAdapter?.getShowSponsored() ?? false;
    const showSuggestedQuestions = await this.storageAdapter?.getShowSuggestedQuestions() ?? false;

    const initialContext = await promptBuilder.build(
      videoData.title,
      videoData.description,
      videoData.transcript,
      showSponsored,
      selectedSummaryLanguage != null,
      showSuggestedQuestions
    );

    this.initializeStream();

    const reader = await this.apiAdapter.generateStreamResponse(
      initialContext,
      this.streamController!.signal
    );

    if (!reader) {
      throw new Error('Failed to initialize stream');
    }

    return { initialContext, reader };
  }

  public async handleUserMessage(
    message: string | MessageContent[],
    conversationHistory: ConversationMessage[]
  ): Promise<ReadableStreamDefaultReader<Uint8Array>> {
    const userMessage: ConversationMessage = {
      role: 'user',
      content: message
    };

    this.initializeStream();

    const reader = await this.apiAdapter.generateStreamResponse(
      [...conversationHistory, userMessage],
      this.streamController!.signal
    );

    if (!reader) {
      throw new Error('Failed to get stream response');
    }

    return reader;
  }

  private processChunk(
    chunk: ReadableStreamReadResult<Uint8Array>,
    buffer: string,
    assistantMessage: string,
    onContent: (content: string, fullMessage: string) => void,
    onError?: (error: Error) => void
  ): { buffer: string; assistantMessage: string; shouldContinue: boolean } {
    let shouldContinue = true;

    if (chunk.done) {
      return { buffer, assistantMessage, shouldContinue: false };
    }

    buffer += new TextDecoder('utf-8').decode(chunk.value);
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.replace(/^data: /, '').trim();
        if (data === '[DONE]') {
          shouldContinue = false;
          break;
        }

        if (data) {
          const result = this.parseStreamData(data, assistantMessage, onContent, onError);
          if (result.error) {
            if (result.error instanceof ContentModerationVideoDataError && onError) {
              onError(result.error);
            }
            return { buffer, assistantMessage: result.assistantMessage, shouldContinue: false };
          }
          assistantMessage = result.assistantMessage;
        }
      }
    }

    return { buffer, assistantMessage, shouldContinue };
  }

  private parseStreamData(
    data: string,
    currentMessage: string,
    onContent: (content: string, fullMessage: string) => void,
    onError?: (error: Error) => void
  ): { assistantMessage: string; error?: Error } {
    try {
      const parsed = JSON.parse(data);

      if (parsed.error?.code === 403 && parsed.error?.metadata?.reasons?.includes('sexual')) {
        throw new ContentModerationVideoDataError(parsed.error.message);
      }

      const content = parsed.choices?.[0]?.delta?.content;
      if (content) {
        currentMessage += content;
        onContent(content, currentMessage);
        return { assistantMessage: currentMessage };
      }
    } catch (error) {
      if (error instanceof ContentModerationVideoDataError) {
        return { assistantMessage: currentMessage, error };
      }
      // Ignore other parsing errors
    }

    return { assistantMessage: currentMessage };
  }

  public async processStreamResponse(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onContent: (content: string, fullMessage: string) => void,
    onError?: (error: Error) => void
  ): Promise<string> {
    let buffer = '';
    let assistantMessage = '';

    try {
      let isReading = true;
      while (isReading) {
        try {
          const chunk = await reader.read();
          const result = this.processChunk(chunk, buffer, assistantMessage, onContent, onError);
          buffer = result.buffer;
          assistantMessage = result.assistantMessage;
          isReading = result.shouldContinue;
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            break;
          }
          throw error;
        }
      }

      return assistantMessage;
    } finally {
      try {
        reader.releaseLock();
      } catch {
        // Ignore errors when releasing lock after abort
      }
    }
  }

  public async getSuggestedQuestions(
    videoId: string,
    summaryText: string
  ): Promise<string[]> {
    try {
      const showSuggestedQuestions = await this.storageAdapter?.getShowSuggestedQuestions();
      
      if (!showSuggestedQuestions) {
        return [];
      }

      if (!this.promptAdapter.buildSuggestedQuestionsPrompt) {
        console.warn('PromptAdapter does not implement buildSuggestedQuestionsPrompt');
        return [];
      }

      const videoData = await videoDataService.fetchVideoData(videoId);
      
      // Ensure the summary text is properly cleaned
      const cleanedSummaryText = cleanStreamedContent(summaryText);
      
      const messages = await this.promptAdapter.buildSuggestedQuestionsPrompt(
        videoData.title,
        videoData.description,
        videoData.transcript,
        cleanedSummaryText
      );

      const controller = new AbortController();
      
      try {
        const reader = await this.apiAdapter.generateStreamResponse(messages, controller.signal);

        if (!reader) {
          console.warn('No reader returned from API for suggested questions');
          return [];
        }

        // Use the existing processStreamResponse method instead of duplicating parsing logic
        let questionResponse = '';
        const questionResponseComplete = await this.processStreamResponse(
          reader,
          (content) => {
            questionResponse += content;
          }
        );

        // Parse the final response
        const cleanedResponse = questionResponseComplete.trim()
          .replace(/^```json/, '')
          .replace(/```$/, '')
          .trim();
        
        let questions: string[] = [];
        
        try {
          const parsedResponse = JSON.parse(cleanedResponse);
          
          if (parsedResponse && Array.isArray(parsedResponse.questions)) {
            questions = parsedResponse.questions;
          } else if (Array.isArray(parsedResponse)) {
            questions = parsedResponse;
          }
        } catch (error) {
          console.error('Error parsing suggested questions response:', error, 'Response:', cleanedResponse);
        }
        
        return questions;
      } finally {
        controller.abort();
      }
    } catch (error) {
      console.error('Error requesting suggested questions:', error);
      return [];
    }
  }
} 
