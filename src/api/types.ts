// Local-only FE types (everything API-shaped lives in ./sunhouse.ts).

export const ALERT_EVENT_TYPES = [
  "grid_lost",
  "grid_restored",
  "low_battery",
  "inverter_hot",
  "fault_detected",
  "long_outage",
] as const;

export type AlertEventType = (typeof ALERT_EVENT_TYPES)[number];

export type AlarmTone = "siren" | "chime" | "pulse" | "alert";

export interface AlarmEventSetting {
  sound: boolean;
  tone: AlarmTone;
}

export interface UserSettings {
  batteryCapacityKwh: number;
  alertGridRestored: boolean;
  alertGridLost: boolean;
  alertLowBattery: boolean;
  alertHighTemp: boolean;
  alertFault: boolean;
  alarmArmIntent: boolean;
  alarmDurationSeconds: number;
  alarmVolume: number;
  alarmEvents: Record<AlertEventType, AlarmEventSetting>;
}

export const DEFAULT_SETTINGS: UserSettings = {
  batteryCapacityKwh: 32,
  alertGridRestored: true,
  alertGridLost: true,
  alertLowBattery: true,
  alertHighTemp: true,
  alertFault: true,
  alarmArmIntent: false,
  alarmDurationSeconds: 20,
  alarmVolume: 0.8,
  alarmEvents: {
    grid_lost: { sound: true, tone: "siren" },
    grid_restored: { sound: false, tone: "chime" },
    low_battery: { sound: false, tone: "pulse" },
    inverter_hot: { sound: false, tone: "pulse" },
    fault_detected: { sound: false, tone: "alert" },
    long_outage: { sound: false, tone: "pulse" },
  },
};

export type SummaryTone = "good" | "warm" | "bad" | "neutral";

export interface DerivedSummary {
  tone: SummaryTone;
  message: string;
}
