import { KeySpot, type KeySpotConfig } from '@roadsidelab/keyspot-core';
import { wrapAnthropic } from '@roadsidelab/keyspot-frameworks';
import { wrapOpenAI } from '@roadsidelab/keyspot-frameworks';
import { withKeySpot } from '@roadsidelab/keyspot-frameworks';
import { wrapOpenClawAgent } from '@roadsidelab/keyspot-frameworks';
import { wrapHermesAgent } from '@roadsidelab/keyspot-frameworks';

export type { KeySpotConfig };

export interface GuardedAgent<T> {
  agent: T;
  guard: KeySpot;
}

function detectFramework(agent: any): string {
  if (agent?.messages?.create) return 'anthropic';
  if (agent?.chat?.completions?.create) return 'openai';
  if (typeof agent?.invoke === 'function') return 'langchain';
  if (typeof agent?.run === 'function') {
    return 'hermes-openclaw';
  }
  return 'generic';
}

export function guardAgent<T>(
  agent: T,
  config: KeySpotConfig = {},
): GuardedAgent<T> {
  const guard = new KeySpot(config);
  const framework = detectFramework(agent);

  let wrapped: T;

  switch (framework) {
    case 'anthropic':
      wrapped = wrapAnthropic(agent as any, guard) as T;
      break;
    case 'openai':
      wrapped = wrapOpenAI(agent as any, guard) as T;
      break;
    case 'langchain':
      wrapped = withKeySpot(agent as any, guard) as T;
      break;
    case 'hermes-openclaw':
      if (typeof (agent as any).run === 'function') {
        wrapped = wrapHermesAgent(agent as any, guard) as T;
        break;
      }
      wrapped = wrapOpenClawAgent(agent as any, guard) as T;
      break;
    default:
      wrapped = agent;
  }

  return { agent: wrapped, guard };
}

export async function guardState<T>(
  state: T,
  config: KeySpotConfig = {},
): Promise<T> {
  const guard = new KeySpot(config);
  return guard.checkpoint(state) as Promise<T>;
}

export { KeySpot } from '@roadsidelab/keyspot-core';
