import { apiCall } from "./client";
import type {
  StationListData,
  DeviceListData,
  EnergyFlowData,
  Station,
  Device,
} from "./types";

export async function listStations(token: string): Promise<Station[]> {
  const data = await apiCall<StationListData>("/station/list", {
    method: "POST",
    token,
    body: { page: 1, count: 10, name: "" },
  });
  return data.list;
}

export async function listDevices(token: string, stationId?: string): Promise<Device[]> {
  const body: Record<string, unknown> = { page: 1, count: 10 };
  if (stationId) body.stationId = stationId;
  const data = await apiCall<DeviceListData>("/device/list", {
    method: "POST",
    token,
    body,
  });
  return data.list;
}

export async function getEnergyFlow(token: string, deviceId: string): Promise<EnergyFlowData> {
  return apiCall<EnergyFlowData>("/deviceState/simple/energy/flow/v1", {
    token,
    query: { deviceId, dataSource: "1" },
  });
}

// --- Solar generation history ---

export interface SolarTimePoint {
  time: string;
  timeDisplay: string;
  value: number;
  isRealValue: boolean;
}

interface SolarHistoryProperty {
  property: { key: string; name: string; unit: string };
  timePoints: SolarTimePoint[];
}

interface SolarHistoryData {
  properties: SolarHistoryProperty[];
}

/**
 * Fetch daily solar generation history (half-hour intervals).
 * Returns the generationPower timePoints array.
 */
export async function getDailySolarHistory(
  token: string,
  deviceId: string,
  date?: string,
): Promise<SolarTimePoint[]> {
  const now = date ?? formatDateForApi(new Date());
  const data = await apiCall<SolarHistoryData>(
    "/deviceOverView/stateAttributeSummary/category/daily",
    {
      method: "POST",
      token,
      query: { deviceId, summaryCategoryKey: "pvInverterPowerClass" },
      body: { time: now },
    },
  );
  const gen = data.properties.find((p) => p.property.key === "generationPower");
  return gen?.timePoints ?? [];
}

/** Format a Date as "YYYY-M-D" (no zero-padding on month/day). */
function formatDateForApi(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
