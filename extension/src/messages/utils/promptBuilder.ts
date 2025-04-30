import { ConversationMessage } from '../../common/adapters/ApiAdapter';
import { Prompts } from '../../common/adapters/PromptAdapter';

export interface IPromptBuilder {
  buildSummaryPrompt: (title: string, description: string, transcript: string, showSponsored: boolean, includeSummaryLanguage: boolean, showSuggestedQuestions: boolean) => Promise<ConversationMessage[]>;
  buildChatPrompt: (title: string, description: string, transcript: string, userMessage: string) => Promise<ConversationMessage[]>;
  buildSuggestedQuestionsPrompt: (title: string, description: string, transcript: string, summary: string) => Promise<ConversationMessage[]>;
  build: (title: string, description: string, transcript: string, showSponsored: boolean, includeSummaryLanguage: boolean, showSuggestedQuestions: boolean) => Promise<ConversationMessage[]>; // Keep for backward compatibility
}

export class PromptBuilder implements IPromptBuilder {
  private prompts: Prompts;
  private selectedSummaryLanguage: string | null;

  constructor(prompts: Prompts, selectedSummaryLanguage: string | null) {
    this.prompts = prompts;
    this.selectedSummaryLanguage = selectedSummaryLanguage;
  }

  private addNumbering(prompt: string, number: number): string {
    return prompt.replace(/(\d+)\. \*\*/g, (_, match) => {
      return `${parseInt(match) + number}. **`;
    });
  }

  private getSystemPromptBaseNumbering(): number {
    // The existing prompts start at 1, so we should increment the sponsored section appropriately
    return 4;
  }

  private combineSystemAndSpecificPrompt(specificPrompt: string): string {
    // Combine the general system prompt with the specific prompt
    return `${this.prompts.system}\n\n${specificPrompt}`;
  }

  async build(
    title: string,
    description: string,
    transcript: string,
    showSponsored: boolean,
    includeSummaryLanguage: boolean,
    showSuggestedQuestions: boolean
  ): Promise<ConversationMessage[]> {
    // Keep for backward compatibility
    return this.buildSummaryPrompt(title, description, transcript, showSponsored, includeSummaryLanguage, showSuggestedQuestions);
  }

  async buildSummaryPrompt(
    title: string,
    description: string,
    transcript: string,
    showSponsored: boolean,
    includeSummaryLanguage: boolean,
    showSuggestedQuestions: boolean
  ): Promise<ConversationMessage[]> {
    if (!title.trim()) {
      throw new Error('Title is required');
    }
    if (!transcript.trim()) {
      throw new Error('Transcript is required');
    }

    // Start with the combination of system and summary prompts
    let systemPrompt = this.combineSystemAndSpecificPrompt(this.prompts.summary);

    // Add sponsored content prompt if enabled
    if (showSponsored) {
      const sponsoredPrompt = this.addNumbering(
        this.prompts.sponsored,
        this.getSystemPromptBaseNumbering()
      );
      systemPrompt = systemPrompt + '\n\n' + sponsoredPrompt;
    }

    // We no longer include suggested questions with the summary prompt
    // They will be requested separately

    // Add language instruction if specified
    let userContent = `I'd like a summary of this YouTube video:
<|context|>
--------------------------------
Title: ${title}
--------------------------------
Description: ${description || 'No description available'}
--------------------------------
Transcript: ${transcript}
</|context|>`;

    if (includeSummaryLanguage && this.selectedSummaryLanguage && this.selectedSummaryLanguage !== 'auto') {
      userContent += `\n\nPlease provide the prominent sentence, summary, and key insights in ${this.selectedSummaryLanguage}.`;
    }

    return [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userContent
      }
    ];
  }

  async buildSuggestedQuestionsPrompt(
    title: string,
    description: string,
    transcript: string,
    summary: string
  ): Promise<ConversationMessage[]> {
    if (!title.trim()) {
      throw new Error('Title is required');
    }
    if (!transcript.trim()) {
      throw new Error('Transcript is required');
    }

    // Combine system prompt with suggested questions prompt
    const systemPrompt = this.combineSystemAndSpecificPrompt(this.prompts.suggestedQuestions);

    const userContent = `Based on this YouTube video, generate suggested questions that viewers might ask:
<|context|>
--------------------------------
Title: ${title}
--------------------------------
Description: ${description || 'No description available'}
--------------------------------
Transcript: ${transcript}
--------------------------------
Summary: ${summary}
</|context|>

CRITICAL: Respond ONLY with a JSON object containing an array of 2 short, natural questions about the video content. 
Format:
{
  "questions": ["First question?", "Second question?"]
}`;

    return [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userContent
      }
    ];
  }

  async buildChatPrompt(
    title: string,
    description: string,
    transcript: string,
    userMessage: string
  ): Promise<ConversationMessage[]> {
    if (!title.trim()) {
      throw new Error('Title is required');
    }
    if (!transcript.trim()) {
      throw new Error('Transcript is required');
    }
    if (!userMessage.trim()) {
      throw new Error('User message is required');
    }

    // Combine the system and chat prompts
    const systemPrompt = this.combineSystemAndSpecificPrompt(this.prompts.chat);

    const userContent = `I'd like to discuss this YouTube video:
<|context|>
--------------------------------
Title: ${title}
--------------------------------
Description: ${description || 'No description available'}
--------------------------------
Transcript: ${transcript}
</|context|>

My question or comment: ${userMessage}`;

    return [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userContent
      }
    ];
  }
} 