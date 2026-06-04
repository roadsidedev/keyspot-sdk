import { AgentGuard } from '@agentguard/core';

/**
 * Represents an OpenClaw agent interface.
 * OpenClaw agents execute tasks via a `run()` method that accepts a goal and returns output.
 */
export interface OpenClawAgent {
  run: (goal: string, context?: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Wraps an OpenClaw agent so all outputs are scanned through AgentGuard.
 *
 * Usage:
 *   const guarded = wrapOpenClawAgent(agent, guard);
 *   const result = await guarded.run("deploy the app", { branch: "main" });
 */
export function wrapOpenClawAgent<T extends OpenClawAgent>(
  agent: T,
  guard: AgentGuard,
): T {
  const originalRun = agent.run.bind(agent);

  (agent as any).run = async (goal: string, context?: Record<string, unknown>) => {
    const result = await originalRun(goal, context);
    return guard.checkpoint(result);
  };

  return agent;
}
