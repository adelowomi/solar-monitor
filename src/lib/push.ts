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
    const { publicKey } = await keyRes.json();
    if (!publicKey) return false;

    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // TS's DOM lib wants a Uint8Array<ArrayBuffer> specifically; the
        // @types/node global augmentation widens the inferred generic to
        // ArrayBufferLike (which includes SharedArrayBuffer), so a plain
        // Uint8Array from Uint8Array.from() no longer satisfies BufferSource
        // under strict mode. The value itself is exactly what the spec
        // expects at runtime.
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      }));

    const json = sub.toJSON();
    await fetch(`${apiBase}/api/events/push/subscribe`, {
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
