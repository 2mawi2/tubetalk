import type { Prompts } from '../../common/adapters/PromptAdapter';

export class PromptsBuilder {
  private prompts: Prompts = {
    system: '1. **First Section**\n2. **Second Section**\n3. **Third Section**\n4. **Fourth Section**\n5. **Fifth Section**\n6. **Sixth Section**\n7. **Seventh Section**',
    sponsored: '**Advertisement/Sponsored Content:**',
    suggestedQuestions: '**Question Suggestions:**',
    summary: '1. **First Section**\n2. **Second Section**\n3. **Third Section**\n4. **Fourth Section**\n5. **Fifth Section**\n6. **Sixth Section**\n7. **Seventh Section**',
    chat: '1. **Answering Questions:**\n2. **Formatting and Style:**\n3. **Image URLs:**'
  };

  public static create(): PromptsBuilder {
    return new PromptsBuilder();
  }

  public withSystemPrompt(systemPrompt: string): PromptsBuilder {
    this.prompts.system = systemPrompt;
    return this;
  }

  public withSummaryPrompt(summaryPrompt: string): PromptsBuilder {
    this.prompts.summary = summaryPrompt;
    return this;
  }

  public withChatPrompt(chatPrompt: string): PromptsBuilder {
    this.prompts.chat = chatPrompt;
    return this;
  }

  public withSponsoredPrompt(sponsoredPrompt: string): PromptsBuilder {
    this.prompts.sponsored = sponsoredPrompt;
    return this;
  }

  public withSuggestedQuestionsPrompt(suggestedQuestionsPrompt: string): PromptsBuilder {
    this.prompts.suggestedQuestions = suggestedQuestionsPrompt;
    return this;
  }

  public withNonStandardNumbering(): PromptsBuilder {
    this.prompts.system = '1. **First**\n3. **Third**\n5. **Fifth**';
    this.prompts.summary = '1. **First**\n3. **Third**\n5. **Fifth**';
    return this;
  }

  public build(): Prompts {
    return { ...this.prompts };
  }
} 