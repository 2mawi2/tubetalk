import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenRouterApiAdapter } from './ApiAdapter';
import type { ConversationMessage } from './ApiAdapter';


global.fetch = vi.fn();

describe('OpenRouterApiAdapter reasoning config', () => {
  const apiKey = 'or-key';
  const messages: ConversationMessage[] = [
    { role: 'user', content: 'hi' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('includes reasoning.effort=low and omits temperature for openai gpt-5 selection', async () => {
    const adapter = new OpenRouterApiAdapter(apiKey, async () => ['openai/gpt-5-mini']);
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      body: new ReadableStream({ start(c) { c.close(); } })
    });

    await adapter.generateStreamResponse(messages);

    const body = JSON.parse((global.fetch as any).mock.calls.at(-1)[1].body);
    expect(body.reasoning).toEqual({ effort: 'low' });
    expect(body).not.toHaveProperty('temperature');
  });

  it('uses temperature for non-reasoning models (e.g., openai/gpt-4o-mini)', async () => {
    const adapter = new OpenRouterApiAdapter(apiKey, async () => ['openai/gpt-4o-mini']);
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      body: new ReadableStream({ start(c) { c.close(); } })
    });

    await adapter.generateStreamResponse(messages);

    const body = JSON.parse((global.fetch as any).mock.calls.at(-1)[1].body);
    expect(body.temperature).toBe(0.1);
    expect(body.reasoning).toBeUndefined();
  });
});


