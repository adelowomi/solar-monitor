// Local-only FE types (everything API-shaped lives in ./sunhouse.ts).

export interface UserSettings {
  batteryCapacityKwh: number;
  lowBatteryThreshold: number;
  highTempThreshold: number;
  alertGridRestored: boolean;
  alertGridLost: boolean;
  alertLowBattery: boolean;
  alertHighTemp: boolean;
  alertFault: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  batteryCapacityKwh: 32,
  lowBatteryThreshold: 20,
  highTempThreshold: 70,
  alertGridRestored: true,
  alertGridLost: true,
  alertLowBattery: true,
  alertHighTemp: true,
  alertFault: true,
};

export type SummaryTone = "good" | "warm" | "bad" | "neutral";

export interface DerivedSummary {
  tone: SummaryTone;
  message: string;
}
