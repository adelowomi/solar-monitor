/* Sunhouse push service worker. Plain JS, served from the origin root. */
/* Mirrored from src/lib/seen-idb.ts — a service worker cannot import a
 * bundled module, so this is a hand-kept copy of that file's dedupe logic.
 * Both MUST use the same DB_NAME, STORE and semantics: drift here means a
 * push notification and its replayed SSE twin both alarm, which is exactly
 * what this machinery exists to prevent. */
const DB_NAME = "sunhouse-alerts";
const STORE = "seen";

function openDb() {
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

// Mirrors markSeen in src/lib/seen-idb.ts. Whichever context sees the event
// first handles it, so a push and a replayed SSE frame cannot double-alert.
async function markSeen(id) {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const get = store.get(id);
      get.onsuccess = () => {
        if (get.result !== undefined) { resolve(false); return; }
        store.put(Date.now(), id);
        resolve(true);
      };
      get.onerror = () => resolve(true);
    });
  } catch {
    return true; // never swallow an alert because storage failed
  }
}

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  event.waitUntil((async () => {
    let payload = {};
    try { payload = event.data ? event.data.json() : {}; } catch { /* ignore */ }

    const id = payload.id || `anon-${Date.now()}`;
    if (!(await markSeen(id))) return;

    await self.registration.showNotification(payload.title || "Sunhouse alert", {
      body: payload.body || "",
      tag: payload.type || "sunhouse",
      renotify: true,
      requireInteraction: payload.severity === "critical",
      data: { url: "/" },
    });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of all) {
      if ("focus" in client) return client.focus();
    }
    return self.clients.openWindow("/");
  })());
});
