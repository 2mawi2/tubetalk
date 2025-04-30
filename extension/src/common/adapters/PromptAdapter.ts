export interface Prompts {
  system: string;
  sponsored: string;
  suggestedQuestions: string;
  summary: string;
  chat: string;
}

export interface PromptAdapter {
  getPrompts(): Promise<Prompts>;
  buildSuggestedQuestionsPrompt?: (title: string, description: string, transcript: string, summary: string) => Promise<any>;
}

export class ChromePromptAdapter implements PromptAdapter {
  // Define the paths to each prompt file
  private readonly PROMPT_PATHS = {
    system: 'src/common/prompts/system_prompt.md',
    sponsored: 'src/common/prompts/sponsored_prompt.md',
    suggestedQuestions: 'src/common/prompts/suggested_questions_prompt.md',
    summary: 'src/common/prompts/summary_prompt.md',
    chat: 'src/common/prompts/chat_prompt.md'
  };
  
  // Cache the promise instead of individual promises
  private promptsPromise: Promise<Prompts> | null = null;

  // Store the resolved URLs for better error reporting
  private promptURLs: Record<string, string> = {};

  constructor() {
    // Initialize the URLs when the adapter is created
    Object.entries(this.PROMPT_PATHS).forEach(([key, path]) => {
      this.promptURLs[key] = chrome.runtime.getURL(path);
      
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[PROMPTS] Initialized ${key} prompt URL: ${this.promptURLs[key]}`);
      }
    });
  }

  async getPrompts(): Promise<Prompts> {
    if (!this.promptsPromise) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[PROMPTS] Loading all prompts...');
      }
      
      this.promptsPromise = Promise.all([
        this.fetchPrompt('system'),
        this.fetchPrompt('sponsored'),
        this.fetchPrompt('suggestedQuestions'),
        this.fetchPrompt('summary'),
        this.fetchPrompt('chat')
      ]).then(([system, sponsored, suggestedQuestions, summary, chat]) => {
        // Validate that all prompts were loaded successfully
        const prompts: Prompts = {
          system,
          sponsored,
          suggestedQuestions,
          summary,
          chat
        };
        
        // Check for empty prompts
        const emptyPrompts = Object.entries(prompts)
          .filter(([_, content]) => !content || content.trim() === '')
          .map(([name]) => name);
        
        if (emptyPrompts.length > 0) {
          console.warn(`[PROMPTS] Warning: Empty prompt content for: ${emptyPrompts.join(', ')}`);
        }
        
        if (process.env.NODE_ENV !== 'production') {
          console.log('[PROMPTS] Successfully loaded all prompts');
          Object.entries(prompts).forEach(([key, content]) => {
            console.log(`[PROMPTS] ${key}: ${content.substring(0, 50)}... (${content.length} chars)`);
          });
        }
        
        return prompts;
      }).catch(error => {
        console.error('[PROMPTS] Error loading prompts:', error);
        throw error;
      });
    }
    
    return this.promptsPromise;
  }

  async buildSuggestedQuestionsPrompt(
    title: string, 
    description: string, 
    transcript: string, 
    summary: string
  ): Promise<any[]> {
    // Import the PromptBuilder directly to avoid circular dependencies
    const { PromptBuilder } = await import('../../messages/utils/promptBuilder');
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEBUG] ChromePromptAdapter.buildSuggestedQuestionsPrompt called');
    }
    
    const prompts = await this.getPrompts();
    
    // Verify the suggestedQuestions prompt is non-empty
    if (!prompts.suggestedQuestions || prompts.suggestedQuestions.trim() === '') {
      console.error('[PROMPTS] Error: suggestedQuestions prompt is empty!');
      throw new Error('The suggested questions prompt is empty');
    }
    
    const promptBuilder = new PromptBuilder(prompts, null);
    
    return promptBuilder.buildSuggestedQuestionsPrompt(
      title,
      description,
      transcript,
      summary
    );
  }

  private async fetchPrompt(promptKey: keyof typeof this.PROMPT_PATHS): Promise<string> {
    const url = this.promptURLs[promptKey];
    
    if (!url) {
      console.error(`[PROMPTS] Error: No URL found for ${promptKey} prompt`);
      throw new Error(`No URL found for ${promptKey} prompt`);
    }
    
    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[PROMPTS] Fetching ${promptKey} prompt from: ${url}`);
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const error = new Error(`HTTP error loading ${promptKey} prompt: ${response.status} ${response.statusText}`);
        console.error(`[PROMPTS] ${error.message}`);
        throw error;
      }
      
      const text = await response.text();
      
      if (!text || text.trim() === '') {
        console.warn(`[PROMPTS] Warning: ${promptKey} prompt file exists but content is empty`);
      } else if (process.env.NODE_ENV !== 'production') {
        console.log(`[PROMPTS] Successfully loaded ${promptKey} prompt (${text.length} chars)`);
      }
      
      return text;
    } catch (error) {
      console.error(`[PROMPTS] Error loading ${promptKey} prompt from ${url}:`, error);
      throw error;
    }
  }
} 