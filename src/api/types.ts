// --- API envelope ---
export interface ApiResponse<T> {
  code: number;
  message: string;
  localMessage: string;
  data: T;
}

// --- Auth ---
export interface LoginRequest {
  account: string;
  password: string; // MD5 hex
}

export interface LoginData {
  accessToken: string;
  accessTokenWillExpiredAt: string;
  refreshToken: string;
  refreshTokenWillExpiredAt: string;
  userId: string;
  userType: number;
  account: string;
}

export interface Session {
  token: string;
  account: string;
  expiresAt: string;
}

// --- Station ---
export interface Station {
  id: string;
  name: string;
  country: string;
  province: string;
  city: string;
  address: string;
  timezone: string;
  installedCapacity: number;
  latitude: number;
  longitude: number;
  installedAt: string;
}

export interface StationListData {
  list: Station[];
  total: number;
}

// --- Device ---
export interface Device {
  id: string;
  name: string;
  stationId: string;
  [key: string]: unknown;
}

export interface DeviceListData {
  list: Device[];
  total: number;
}

// --- Energy Flow ---
export interface Field {
  key: string;
  unit: string;
  value: number | string | null;
  valueDisplay: string;
  isHidden: boolean;
  nameDisplay: string;
}

export type FieldMap = Record<string, Field>;

export interface FlowInfo {
  flowDirection: number | null;
  isLight: boolean;
}

export interface EnergyFlowData {
  deviceAttributeState: {
    fields: FieldMap;
  };
  pvPanelFlow: FlowInfo;
  gridFlow: FlowInfo;
  batteryFlow: FlowInfo;
  loadFlow: FlowInfo;
  groups: unknown[];
}

// --- Alarm ---
export interface Alarm {
  id: string;
  level: number;
  message: string;
  createdAt: string;
  isProcessed: boolean;
}

export interface AlarmListData {
  list: Alarm[];
  total: number;
}

// --- Settings (localStorage) ---
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

// --- Derived state ---
export type SummaryTone = "good" | "warm" | "bad" | "neutral";

export interface DerivedSummary {
  tone: SummaryTone;
  message: string;
}
