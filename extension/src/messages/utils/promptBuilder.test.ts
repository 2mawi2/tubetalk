import { describe, it, expect } from 'vitest';
import { PromptBuilder } from './promptBuilder';
import { PromptsBuilder, VideoDataBuilder } from '../../test/builders';
import { ConversationMessage } from '../../common/adapters/ApiAdapter';

describe('PromptBuilder', () => {
  it('should build basic conversation messages without sponsored content or suggested questions', async () => {
    const prompts = PromptsBuilder.create().build();
    const videoData = VideoDataBuilder.create().build();
    const builder = new PromptBuilder(prompts, 'en');

    const result = await builder.buildSummaryPrompt(
      videoData.title,
      videoData.description,
      videoData.transcript,
      false,
      false,
      false
    );

    // Test that the result has two messages
    expect(result).toHaveLength(2);
    
    // Test that the system message contains both system and summary prompts
    expect(result[0].role).toBe('system');
    expect(result[0].content).toContain(prompts.system);
    expect(result[0].content).toContain(prompts.summary);
    
    // Test that the user message contains the correct data
    expect(result[1].role).toBe('user');
    expect(result[1].content).toContain(videoData.title);
    expect(result[1].content).toContain(videoData.description);
    expect(result[1].content).toContain(videoData.transcript);
  });

  it('should include sponsored content when showSponsored is true', async () => {
    const prompts = PromptsBuilder.create().build();
    const videoData = VideoDataBuilder.create().build();
    const builder = new PromptBuilder(prompts, 'en');

    const result = await builder.buildSummaryPrompt(
      videoData.title,
      videoData.description,
      videoData.transcript,
      true,
      false,
      false
    );

    expect(result).toHaveLength(2);
    expect(result[0].content).toContain('**Advertisement/Sponsored Content:**');
  });

  it('should build suggested questions separately with new method', async () => {
    const prompts = PromptsBuilder.create().build();
    const videoData = VideoDataBuilder.create().build();
    const builder = new PromptBuilder(prompts, 'en');
    const summary = "This is a test summary";

    const result = await builder.buildSuggestedQuestionsPrompt(
      videoData.title,
      videoData.description,
      videoData.transcript,
      summary
    );

    expect(result).toHaveLength(2);
    expect(result[0].content).toContain('**Question Suggestions:**');
    expect(result[1].content).toContain(videoData.title);
    expect(result[1].content).toContain(videoData.description);
    expect(result[1].content).toContain(videoData.transcript);
    expect(result[1].content).toContain(summary);
  });

  it('should include both system prompt and suggested questions in the suggested questions prompt', async () => {
    const prompts = PromptsBuilder.create().build();
    const videoData = VideoDataBuilder.create().build();
    const builder = new PromptBuilder(prompts, 'en');
    const summary = "This is a test summary";

    const result = await builder.buildSuggestedQuestionsPrompt(
      videoData.title,
      videoData.description,
      videoData.transcript,
      summary
    );

    const [systemMessage, _] = result as [ConversationMessage, ConversationMessage];
    
    // Verify both system prompt and suggested questions are included
    expect(systemMessage.content).toContain(prompts.system);
    expect(systemMessage.content).toContain(prompts.suggestedQuestions);
  });

  it('should handle empty description', async () => {
    const prompts = PromptsBuilder.create().build();
    const videoData = VideoDataBuilder.create()
      .withDescription('')
      .build();
    const builder = new PromptBuilder(prompts, 'en');

    const result = await builder.buildSummaryPrompt(
      videoData.title,
      videoData.description,
      videoData.transcript,
      false,
      false,
      false
    );

    expect(result).toHaveLength(2);
    expect(result[1].content).toContain('Description:');
    expect(result[1].content).toContain(videoData.title);
    expect(result[1].content).toContain(videoData.transcript);
  });

  it('should throw error if title is empty', async () => {
    const prompts = PromptsBuilder.create().build();
    const videoData = VideoDataBuilder.create()
      .withTitle('')
      .build();
    const builder = new PromptBuilder(prompts, 'en');

    await expect(builder.buildSummaryPrompt(
      videoData.title,
      videoData.description,
      videoData.transcript,
      false,
      false,
      false
    )).rejects.toThrow('Title is required');
  });

  it('should throw error if transcript is empty', async () => {
    const prompts = PromptsBuilder.create().build();
    const videoData = VideoDataBuilder.create()
      .withTranscript('')
      .build();
    const builder = new PromptBuilder(prompts, 'en');

    await expect(builder.buildSummaryPrompt(
      videoData.title,
      videoData.description,
      videoData.transcript,
      false,
      false,
      false
    )).rejects.toThrow('Transcript is required');
  });

  it('should include summary language in the prompt when language is specified', async () => {
    const prompts = PromptsBuilder.create().build();
    const videoData = VideoDataBuilder.create().build();
    const builder = new PromptBuilder(prompts, 'en');

    const result = await builder.buildSummaryPrompt(
      videoData.title,
      videoData.description,
      videoData.transcript,
      false,
      true,
      false
    );

    expect(result).toHaveLength(2);
    expect(result[1].content).toContain('Please provide the prominent sentence, summary, and key insights in en');
  });

  it('should not include summary language in the prompt when language is null', async () => {
    const prompts = PromptsBuilder.create().build();
    const videoData = VideoDataBuilder.create().build();
    const builder = new PromptBuilder(prompts, null);

    const result = await builder.buildSummaryPrompt(
      videoData.title,
      videoData.description,
      videoData.transcript,
      false,
      true,
      false
    );

    expect(result).toHaveLength(2);
    expect(result[1].content).not.toContain('following language:');
  });

  it('should handle system prompt with non-standard numbering', async () => {
    const prompts = PromptsBuilder.create().withNonStandardNumbering().build();
    const videoData = VideoDataBuilder.create().build();
    const builder = new PromptBuilder(prompts, 'en');
    const summary = "This is a test summary";
    
    // Test summary prompt
    const summaryResult = await builder.buildSummaryPrompt(
      videoData.title,
      videoData.description,
      videoData.transcript,
      true,
      false,
      false
    );

    const [systemMessage, _] = summaryResult as [ConversationMessage, ConversationMessage];
    
    // Verify the system prompt sections and sponsored content
    expect(systemMessage.content).toContain('1. **First**');
    expect(systemMessage.content).toContain('3. **Third**');
    expect(systemMessage.content).toContain('5. **Fifth**');
    expect(systemMessage.content).toContain('**Advertisement/Sponsored Content:**');
    
    // Test suggested questions as separate call
    const questionsResult = await builder.buildSuggestedQuestionsPrompt(
      videoData.title,
      videoData.description,
      videoData.transcript,
      summary
    );
    
    const [questionsSystemMessage, __] = questionsResult as [ConversationMessage, ConversationMessage];
    expect(questionsSystemMessage.content).toContain('**Question Suggestions:**');
  });

  it('should build chat prompt correctly', async () => {
    const prompts = PromptsBuilder.create().build();
    const videoData = VideoDataBuilder.create().build();
    const builder = new PromptBuilder(prompts, 'en');
    const userMessage = 'What is this video about?';

    const result = await builder.buildChatPrompt(
      videoData.title,
      videoData.description,
      videoData.transcript,
      userMessage
    );

    expect(result).toHaveLength(2);
    
    // Test that the system message contains both system and chat prompts
    expect(result[0].role).toBe('system');
    expect(result[0].content).toContain(prompts.system);
    expect(result[0].content).toContain(prompts.chat);
    
    // Test that the user message contains the correct data
    expect(result[1].role).toBe('user');
    expect(result[1].content).toContain(videoData.title);
    expect(result[1].content).toContain(videoData.description);
    expect(result[1].content).toContain(videoData.transcript);
    expect(result[1].content).toContain(userMessage);
  });

  it('should ensure transcript is included in all chat messages', async () => {
    const prompts = PromptsBuilder.create().build();
    const videoData = VideoDataBuilder.create().build();
    const builder = new PromptBuilder(prompts, 'en');

    // First message
    const firstMessage = await builder.buildChatPrompt(
      videoData.title,
      videoData.description,
      videoData.transcript,
      "What is this video about?"
    );

    // Second message
    const secondMessage = await builder.buildChatPrompt(
      videoData.title,
      videoData.description,
      videoData.transcript,
      "Tell me more about the main topic"
    );

    // Verify both messages include the transcript
    expect(firstMessage[1].content).toContain(videoData.transcript);
    expect(secondMessage[1].content).toContain(videoData.transcript);

    // Verify the format is consistent
    expect(firstMessage[1].content).toMatch(/<\|context\|>[\s\S]*?Transcript:[\s\S]*?<\/\|context\|>/);
    expect(secondMessage[1].content).toMatch(/<\|context\|>[\s\S]*?Transcript:[\s\S]*?<\/\|context\|>/);
  });
});

describe('PromptBuilder timestamp formatting tests', () => {
  it('should ensure system prompt is properly combined with specific prompts', async () => {
    // Create test prompts with unique identifiers
    const systemPrompt = "SYSTEM_PROMPT_CONTENT";
    const summaryPrompt = "SUMMARY_PROMPT_CONTENT";
    const chatPrompt = "CHAT_PROMPT_CONTENT";
    const suggestedQuestionsPrompt = "SUGGESTED_QUESTIONS_PROMPT_CONTENT";
    const sponsoredPrompt = "SPONSORED_PROMPT_CONTENT";
    
    const prompts = PromptsBuilder.create()
      .withSystemPrompt(systemPrompt)
      .withSummaryPrompt(summaryPrompt)
      .withChatPrompt(chatPrompt)
      .withSuggestedQuestionsPrompt(suggestedQuestionsPrompt)
      .withSponsoredPrompt(sponsoredPrompt)
      .build();
    
    const videoData = VideoDataBuilder.create().build();
    const builder = new PromptBuilder(prompts, 'en');

    // Test summary prompt: system + summary
    const summaryResult = await builder.buildSummaryPrompt(
      videoData.title,
      videoData.description,
      videoData.transcript,
      false, // no sponsored content
      false,
      false
    );
    
    // Verify structure - system prompt should be first, followed by specific prompt
    expect(summaryResult[0].role).toBe('system');
    // Type assertion to handle content which can be string | MessageContent[]
    const summaryContent = summaryResult[0].content as string;
    expect(summaryContent).toContain(systemPrompt);
    expect(summaryContent).toContain(summaryPrompt);
    expect(summaryContent.indexOf(systemPrompt)).toBeLessThan(
      summaryContent.indexOf(summaryPrompt)
    );
    
    // Test chat prompt: system + chat
    const chatResult = await builder.buildChatPrompt(
      videoData.title,
      videoData.description,
      videoData.transcript,
      "What is this video about?"
    );
    
    // Verify structure
    expect(chatResult[0].role).toBe('system');
    const chatContent = chatResult[0].content as string;
    expect(chatContent).toContain(systemPrompt);
    expect(chatContent).toContain(chatPrompt);
    expect(chatContent.indexOf(systemPrompt)).toBeLessThan(
      chatContent.indexOf(chatPrompt)
    );
    
    // Test suggested questions prompt: system + suggested questions
    const suggestedQuestionsResult = await builder.buildSuggestedQuestionsPrompt(
      videoData.title,
      videoData.description,
      videoData.transcript,
      "This is a summary"
    );
    
    // Verify structure
    expect(suggestedQuestionsResult[0].role).toBe('system');
    const suggestedQuestionsContent = suggestedQuestionsResult[0].content as string;
    expect(suggestedQuestionsContent).toContain(systemPrompt);
    expect(suggestedQuestionsContent).toContain(suggestedQuestionsPrompt);
    expect(suggestedQuestionsContent.indexOf(systemPrompt)).toBeLessThan(
      suggestedQuestionsContent.indexOf(suggestedQuestionsPrompt)
    );
  });
  
  it('should correctly include sponsored content when enabled', async () => {
    // Create test prompts with unique identifiers
    const systemPrompt = "SYSTEM_PROMPT_CONTENT";
    const summaryPrompt = "SUMMARY_PROMPT_CONTENT";
    const sponsoredPrompt = "SPONSORED_PROMPT_CONTENT";
    
    const prompts = PromptsBuilder.create()
      .withSystemPrompt(systemPrompt)
      .withSummaryPrompt(summaryPrompt)
      .withSponsoredPrompt(sponsoredPrompt)
      .build();
    
    const videoData = VideoDataBuilder.create().build();
    const builder = new PromptBuilder(prompts, 'en');

    // Test with sponsored content
    const withSponsoredResult = await builder.buildSummaryPrompt(
      videoData.title,
      videoData.description,
      videoData.transcript,
      true, // Include sponsored content
      false,
      false
    );
    
    // Verify sponsored content is included
    const withSponsoredContent = withSponsoredResult[0].content as string;
    expect(withSponsoredContent).toContain(sponsoredPrompt);
    
    // Test without sponsored content
    const withoutSponsoredResult = await builder.buildSummaryPrompt(
      videoData.title,
      videoData.description,
      videoData.transcript,
      false, // Don't include sponsored content
      false,
      false
    );
    
    // Verify sponsored content is not included
    const withoutSponsoredContent = withoutSponsoredResult[0].content as string;
    expect(withoutSponsoredContent).not.toContain(sponsoredPrompt);
  });

  it('should include language specification when requested', async () => {
    const prompts = PromptsBuilder.create().build();
    const videoData = VideoDataBuilder.create().build();
    const language = 'fr'; // Using French as test language
    const builder = new PromptBuilder(prompts, language);

    // Test with language specification
    const withLanguageResult = await builder.buildSummaryPrompt(
      videoData.title,
      videoData.description,
      videoData.transcript,
      false,
      true, // Include language specification
      false
    );
    
    // Verify language is included in user prompt
    const withLanguageContent = withLanguageResult[1].content as string;
    expect(withLanguageContent).toContain(`in ${language}`);
    
    // Test without language specification
    const withoutLanguageResult = await builder.buildSummaryPrompt(
      videoData.title,
      videoData.description,
      videoData.transcript,
      false,
      false, // Don't include language specification
      false
    );
    
    // Verify language is not included in user prompt
    const withoutLanguageContent = withoutLanguageResult[1].content as string;
    expect(withoutLanguageContent).not.toContain(`in ${language}`);
  });
}); 