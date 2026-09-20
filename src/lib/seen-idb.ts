// Mirrored in public/sw.js — a service worker cannot import a bundled
// module, so the dedupe logic there is a hand-kept copy of this file. Both
// MUST use the same DB_NAME, STORE and semantics: drift here means a push
// notification and its replayed SSE twin both alarm, which is exactly what
// this machinery exists to prevent.
const DB_NAME = "sunhouse-alerts";
const STORE = "seen";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Returns true the first time an id is seen. Shared by the page and the
 * service worker so whichever receives an event first handles it.
 */
export async function markSeenIdb(id: string): Promise<boolean> {
  const db = await open();
  try {
    return await new Promise<boolean>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const get = store.get(id);
      get.onsuccess = () => {
        if (get.result !== undefined) { resolve(false); return; }
        store.put(Date.now(), id);
        resolve(true);
      };
      get.onerror = () => reject(get.error);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    void prune(db);
    db.close();
  }
}

async function prune(db: IDBDatabase): Promise<void> {
  try {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const cursorReq = store.openCursor();
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (!cursor) return;
      if (Date.now() - (cursor.value as number) > MAX_AGE_MS) cursor.delete();
      cursor.continue();
    };
  } catch { /* pruning is best-effort */ }
}
