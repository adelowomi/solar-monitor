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
