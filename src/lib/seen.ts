import { markSeenIdb } from "./seen-idb";

let memory = new Set<string>();

function markSeenMemory(id: string): boolean {
  if (memory.has(id)) return false;
  memory.add(id);
  if (memory.size > 500) memory = new Set([...memory].slice(-250));
  return true;
}

/**
 * First-writer-wins dedupe shared with the service worker. Falls back to an
 * in-memory set when IndexedDB is unavailable (private browsing) — worst case
 * a duplicate alert, never a thrown error.
 */
export async function markSeen(id: string): Promise<boolean> {
  if (typeof indexedDB === "undefined") return markSeenMemory(id);
  try {
    return await markSeenIdb(id);
  } catch {
    return markSeenMemory(id);
  }
}

/** Test-only. */
export function __resetSeen(): void {
  memory = new Set();
}
