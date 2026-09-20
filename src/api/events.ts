import { ALERT_EVENT_TYPES, type AlertEventType, type UserSettings } from "./types";

const REPLAY_FRESHNESS_MS = 2 * 60_000;

export interface AlertEventSample {
  gridOn: boolean;
  batterySoc: number;
  generationPowerKw: number;
  totalActivePowerKw: number;
  faultId: number;
  acInputVoltage: number;
  maxHeatSinkTempC: number;
}

export interface AlertEvent {
  id: string;
  type: AlertEventType;
  occurredAt: string;
  severity: "critical" | "warning" | "info";
  title: string;
  body: string;
  replay: boolean;
  sample: AlertEventSample;
}

export function parseAlertEvent(data: string): AlertEvent | null {
  try {
    const raw = JSON.parse(data);
    if (!ALERT_EVENT_TYPES.includes(raw?.type)) return null;
    if (typeof raw.id !== "string") return null;
    return { ...raw, replay: Boolean(raw.replay) } as AlertEvent;
  } catch {
    return null;
  }
}

/**
 * A replayed event only makes noise if it is still fresh — waking a laptop at
 * 07:00 must not blare about a 03:00 outage.
 */
export function shouldSound(event: AlertEvent, settings: UserSettings): boolean {
  if (!settings.alarmEvents[event.type]?.sound) return false;
  if (!event.replay) return true;
  const age = Date.now() - new Date(event.occurredAt).getTime();
  return age <= REPLAY_FRESHNESS_MS;
}
