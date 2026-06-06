import { KeySpot } from '@roadsidelab/keyspot-core';

type OpenAIChatParams = {
  messages: Array<{ role: string; content: string }>;
  [key: string]: any;
};

type OpenAIChatResult = {
  choices: Array<{
    message?: { content: string | null; [key: string]: any };
    [key: string]: any;
  }>;
  [key: string]: any;
};

/**
 * Wraps an OpenAI SDK client to scan chat completions through KeySpot.
 *
 * Usage:
 *   const guarded = wrapOpenAI(openai, guard);
 *   const completion = await guarded.chat.completions.create({ ... });
 */
export function wrapOpenAI<T extends { chat: { completions: { create: (params: any) => Promise<any> } } }>(
  client: T,
  guard: KeySpot,
): T {
  const originalCreate = client.chat.completions.create.bind(client.chat.completions);

  (client.chat.completions as any).create = async (params: OpenAIChatParams) => {
    const result: OpenAIChatResult = await originalCreate(params);

    // Scan each choice's message content for secrets
    const scannedChoices = await Promise.all(
      result.choices.map(async (choice) => {
        if (choice.message?.content) {
          const clean = await guard.checkpoint({ content: choice.message.content });
          return {
            ...choice,
            message: { ...choice.message, content: clean.content },
          };
        }
        return choice;
      }),
    );

    return { ...result, choices: scannedChoices };
  };

  return client;
}
