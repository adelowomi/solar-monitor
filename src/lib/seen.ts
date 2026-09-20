/**
 * First-writer-wins dedupe across the page and (from phase 3) the service
 * worker. Async by design so the storage can change without touching callers.
 */
let seen = new Set<string>();

export async function markSeen(id: string): Promise<boolean> {
  if (seen.has(id)) return false;
  seen.add(id);
  if (seen.size > 500) seen = new Set([...seen].slice(-250));
  return true;
}

/** Test-only. */
export function __resetSeen(): void {
  seen = new Set();
}
