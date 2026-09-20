function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function registerPush(
  apiBase: string, apiKey: string, deviceId: string
): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  if (Notification.permission !== "granted") return false;

  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    const keyRes = await fetch(`${apiBase}/api/events/push/key`, {
      headers: { "X-Api-Key": apiKey },
    });
    // A failed key fetch must not be reported as a working subscription —
    // arming would otherwise claim push is on when nothing was registered.
    if (!keyRes.ok) return false;
    const { publicKey } = await keyRes.json();
    if (!publicKey) return false;

    const appKeyBytes = urlBase64ToUint8Array(publicKey);

    let sub = await reg.pushManager.getSubscription();
    if (sub) {
      // A subscription minted under a different (e.g. rotated) VAPID key
      // will never deliver, silently, with nothing visible client-side —
      // re-subscribe rather than trust a stale registration.
      const existingKey = sub.options.applicationServerKey;
      const existingBytes = existingKey ? new Uint8Array(existingKey) : null;
      const same =
        existingBytes !== null &&
        existingBytes.length === appKeyBytes.length &&
        existingBytes.every((b, i) => b === appKeyBytes[i]);
      if (!same) {
        await sub.unsubscribe();
        sub = null;
      }
    }
    sub ??= await reg.pushManager.subscribe({
      userVisibleOnly: true,
      // TS's DOM lib wants a Uint8Array<ArrayBuffer> specifically; the
      // @types/node global augmentation widens the inferred generic to
      // ArrayBufferLike (which includes SharedArrayBuffer), so a plain
      // Uint8Array from Uint8Array.from() no longer satisfies BufferSource
      // under strict mode. The value itself is exactly what the spec
      // expects at runtime.
      applicationServerKey: appKeyBytes as BufferSource,
    });

    const json = sub.toJSON();
    const saveRes = await fetch(`${apiBase}/api/events/push/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
      body: JSON.stringify({
        deviceId,
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
        userAgent: navigator.userAgent,
        label: null,
      }),
    });
    // A subscription the server did not store is not a working subscription.
    if (!saveRes.ok) return false;

    return true;
  } catch {
    return false;
  }
}

export async function unregisterPush(apiBase: string, apiKey: string): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await sub.unsubscribe();
  await fetch(`${apiBase}/api/events/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`, {
    method: "DELETE",
    headers: { "X-Api-Key": apiKey },
  }).catch(() => { /* best effort */ });
}
