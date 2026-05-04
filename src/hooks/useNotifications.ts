import { useState, useCallback } from "react";

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );
  const [enabled, setEnabled] = useState(
    typeof Notification !== "undefined" && Notification.permission === "granted"
  );

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm === "granted") {
      setEnabled(true);
      new Notification("Sunhouse notifications enabled", {
        body: "We'll let you know when something important happens.",
      });
    }
  }, []);

  const toggle = useCallback(() => {
    setEnabled((v) => !v);
  }, []);

  const notify = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!enabled || permission !== "granted") return;
      try {
        new Notification(title, options);
      } catch {
        // Notification blocked or not supported
      }
    },
    [enabled, permission]
  );

  return { permission, enabled, toggle, requestPermission, notify };
}
