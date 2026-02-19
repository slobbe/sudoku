export const DEFAULT_HISTORY_LIMIT = 300;

export function pushBoundedHistory<T>(history: readonly T[], entry: T, limit = DEFAULT_HISTORY_LIMIT): T[] {
  const next = [...history, entry];
  if (next.length <= limit) {
    return next;
  }

  return next.slice(-limit);
}
