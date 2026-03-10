import { DeltaUpdate } from '@/types';

/**
 * Resolves conflicts between a local change and a remote delta.
 * Currently implements a Last-Write-Wins (LWW) strategy.
 */
export function resolveConflict(
  localTimestamp: number,
  remoteDelta: DeltaUpdate,
  localClientId: string
): 'remote' | 'local' {
  // If timestamps differ, latest wins
  if (remoteDelta.timestamp > localTimestamp) {
    return 'remote';
  }

  if (remoteDelta.timestamp < localTimestamp) {
    return 'local';
  }

  // If timestamps are identical, use deterministic tie-breaker (e.g., lower clientId wins)
  return remoteDelta.clientId < localClientId ? 'remote' : 'local';
}

/**
 * Merges multiple deltas into a single change set.
 */
export function mergeDeltas(deltas: DeltaUpdate[]): Record<string, unknown> {
  // Sort by timestamp
  const sorted = [...deltas].sort((a, b) => a.timestamp - b.timestamp);

  const merged: Record<string, unknown> = {};
  for (const delta of sorted) {
    Object.assign(merged, delta.changes);
  }

  return merged;
}
