import { AgentGuard } from '@agentguard/core';

/**
 * Represents a Hermes agent interface.
 * Hermes agents process tasks via `run()` or `execute()` with an input object.
 */
export interface HermesAgent {
  run: (input: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Wraps a Hermes agent so all outputs are scanned through AgentGuard.
 *
 * Usage:
 *   const guarded = wrapHermesAgent(agent, guard);
 *   const result = await guarded.run({ task: "audit repo", path: "./src" });
 */
export function wrapHermesAgent<T extends HermesAgent>(
  agent: T,
  guard: AgentGuard,
): T {
  const originalRun = agent.run.bind(agent);

  (agent as any).run = async (input: Record<string, unknown>) => {
    const result = await originalRun(input);
    return guard.checkpoint(result);
  };

  return agent;
}
