import { AgentGuard } from '@agentguard/core';

/**
 * Wraps a LangChain Runnable to scan outputs through AgentGuard.
 * Compatible with LangChain JS v0.1+.
 *
 * Usage:
 *   const guardedChain = withAgentGuard(chain, guard);
 *   const result = await guardedChain.invoke({ input: '...' });
 */
export function withAgentGuard<T extends { invoke: (...args: any[]) => Promise<any> }>(
  runnable: T,
  guard: AgentGuard,
): T {
  const originalInvoke = runnable.invoke.bind(runnable);

  (runnable as any).invoke = async (...args: any[]) => {
    const result = await originalInvoke(...args);
    return guard.checkpoint(result);
  };

  return runnable;
}
