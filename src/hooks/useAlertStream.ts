import { useCallback, useEffect, useRef, useState } from "react";
import { SseParser } from "../lib/sse";
import { markSeen } from "../lib/seen";
import { parseAlertEvent, shouldSound, type AlertEvent } from "../api/events";
import type { UserSettings } from "../api/types";
import type { Alarm } from "../lib/alarm";

const DEVICE_KEY = "sunhouse_device_id";

export function deviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

interface Options {
  apiBase: string;
  apiKey: string;
  settings: UserSettings;
  alarm: Alarm;
  onEvent?: (e: AlertEvent) => void;
}

export function useAlertStream({ apiBase, apiKey, settings, alarm, onEvent }: Options) {
  const [connected, setConnected] = useState(false);
  const [activeAlert, setActiveAlert] = useState<AlertEvent | null>(null);
  const lastEventId = useRef<string | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const dismiss = useCallback(() => {
    alarm.stop();
    setActiveAlert(null);
  }, [alarm]);

  useEffect(() => {
    const controller = new AbortController();
    let attempt = 0;
    let stopped = false;

    async function connect() {
      while (!stopped) {
        let connectedAt = 0;
        let sawData = false;

        try {
          const url = new URL(`${apiBase}/api/events/stream`);
          url.searchParams.set("deviceId", deviceId());
          url.searchParams.set("armed", String(alarm.isArmed()));

          const headers: Record<string, string> = { "X-Api-Key": apiKey };
          if (lastEventId.current) headers["Last-Event-ID"] = lastEventId.current;

          const res = await fetch(url, { headers, signal: controller.signal });
          if (!res.ok || !res.body) throw new Error(`stream ${res.status}`);

          setConnected(true);
          connectedAt = Date.now();

          const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
          const parser = new SseParser();

          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            sawData = true;
            for (const frame of parser.push(value)) {
              if (frame.id) lastEventId.current = frame.id;
              const event = parseAlertEvent(frame.data);
              if (!event) continue;
              if (!(await markSeen(event.id))) continue;
              if (stopped) return;

              onEventRef.current?.(event);
              if (shouldSound(event, settingsRef.current)) {
                const { tone } = settingsRef.current.alarmEvents[event.type];
                alarm.play(tone, settingsRef.current.alarmDurationSeconds * 1000,
                  settingsRef.current.alarmVolume);
                setActiveAlert(event);
              }
            }
          }
        } catch {
          if (stopped) return;
        }

        // Only treat this as a healthy connection once it actually delivered
        // something, or stayed open a while. A server that accepts and instantly
        // closes (or drops mid-stream) must still escalate the backoff instead
        // of spinning. Runs whether the loop above ended normally or via the
        // catch above.
        if (sawData || (connectedAt > 0 && Date.now() - connectedAt > 10_000)) attempt = 0;

        setConnected(false);
        // Backoff 1s -> 30s with jitter.
        const delay = Math.min(30_000, 1_000 * 2 ** attempt++) * (0.5 + Math.random() / 2);
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    void connect();
    return () => { stopped = true; controller.abort(); };
  }, [apiBase, apiKey, alarm]);

  // Report arming changes so the server knows whether to fall back to push.
  useEffect(() => {
    const report = (armed: boolean) => {
      void fetch(`${apiBase}/api/events/presence`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
        body: JSON.stringify({ deviceId: deviceId(), armed }),
      }).catch(() => { /* presence is best-effort */ });
    };
    return alarm.onStateChange(report);
  }, [apiBase, apiKey, alarm]);

  return { connected, activeAlert, dismiss };
}
