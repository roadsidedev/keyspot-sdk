import { KeySpot } from '@roadsidelab/keyspot-core';

/**
 * Wraps a LangChain Runnable to scan outputs through KeySpot.
 * Compatible with LangChain JS v0.1+.
 *
 * Usage:
 *   const guardedChain = withKeySpot(chain, guard);
 *   const result = await guardedChain.invoke({ input: '...' });
 */
function withKeySpot<T extends { invoke: (...args: any[]) => Promise<any> }>(
  runnable: T,
  guard: KeySpot,
): T {
  const originalInvoke = runnable.invoke.bind(runnable);

  (runnable as any).invoke = async (...args: any[]) => {
    const result = await originalInvoke(...args);
    return guard.checkpoint(result);
  };

  return runnable;
}

export { withKeySpot };
