import { AgentGuard } from '@agentguard/core';

type AnthropicMessageCreateParams = {
  messages: Array<{ role: string; content: string | Array<any> }>;
  [key: string]: any;
};

type AnthropicMessageResult = {
  content: Array<{ type: string; text?: string; [key: string]: any }>;
  [key: string]: any;
};

/**
 * Creates an Anthropic SDK client wrapper that scans responses.
 *
 * Usage:
 *   const guarded = wrapAnthropic(anthropic, guard);
 *   const msg = await guarded.messages.create({ ... });
 */
export function wrapAnthropic<T extends { messages: { create: (params: any) => Promise<any> } }>(
  client: T,
  guard: AgentGuard,
): T {
  const originalCreate = client.messages.create.bind(client.messages);

  (client.messages as any).create = async (params: AnthropicMessageCreateParams) => {
    const result: AnthropicMessageResult = await originalCreate(params);

    // Scan assistant response content for secrets
    const scannedContent = await Promise.all(
      result.content.map(async (block) => {
        if (block.type === 'text' && block.text) {
          const clean = await guard.checkpoint({ text: block.text });
          return { ...block, text: clean.text };
        }
        return block;
      }),
    );

    return { ...result, content: scannedContent };
  };

  return client;
}
