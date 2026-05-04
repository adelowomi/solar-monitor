import type { FieldMap, DerivedSummary, UserSettings } from "../api/types";

function fieldValue(fields: FieldMap, key: string): number {
  const f = fields[key];
  if (!f || f.value == null) return 0;
  return typeof f.value === "number" ? f.value : parseFloat(f.value) || 0;
}

function fieldDisplay(fields: FieldMap, key: string): string {
  return fields[key]?.valueDisplay ?? "\u2014";
}

/**
 * Estimate remaining battery hours using actual DC measurements when available.
 * Uses V × A from the inverter for a more accurate discharge rate than the
 * reported batteryPower field, which can lag or be rounded.
 */
export function estimateBatteryHours(
  socPct: number,
  dischargeKw: number,
  capacityKwh: number,
  batteryVoltage?: number,
  dischargeCurrent?: number
): number | null {
  // Prefer actual DC power (V × A) when both readings are available
  let actualDischargeKw = dischargeKw;
  if (batteryVoltage && batteryVoltage > 0 && dischargeCurrent && dischargeCurrent > 0) {
    actualDischargeKw = (batteryVoltage * dischargeCurrent) / 1000;
  }

  if (actualDischargeKw <= 0.01) return null;
  const usableKwh = capacityKwh * (socPct / 100);
  return usableKwh / actualDischargeKw;
}

export interface DerivedState {
  soc: number;
  batteryPower: number;
  batteryCharging: boolean;
  batteryDischarging: boolean;
  pvPower: number;
  loadPower: number;
  acInputVoltage: number;
  acInputPower: number;
  gridOn: boolean;
  heatSinkTemp: number;
  workingMode: string;
  faultId: number;
  batteryVoltage: number;
  acOutputFrequency: number;
  todayPvGen: number;
  todayLoadConsumed: number;
  todayBattDischarge: number;
  loadPercentage: number;
  batteryHoursLeft: number | null;
}

export function deriveState(fields: FieldMap, settings: UserSettings): DerivedState {
  const soc = fieldValue(fields, "batterySOC");
  const batteryPower = fieldValue(fields, "batteryPower");
  const batteryDischarging = batteryPower < -0.01;
  const batteryCharging = batteryPower > 0.01;
  const pvPower = fieldValue(fields, "generationPower");
  const loadPower = fieldValue(fields, "totalActivePower");
  const acInputVoltage = fieldValue(fields, "acInputVoltage");
  const lineConn = fields["lineConnectionStatus"]?.value;
  const gridOn = acInputVoltage > 50 && lineConn === "1";

  return {
    soc,
    batteryPower,
    batteryCharging,
    batteryDischarging,
    pvPower,
    loadPower,
    acInputVoltage,
    acInputPower: fieldValue(fields, "acInputPower"),
    gridOn,
    heatSinkTemp: fieldValue(fields, "maxHeatSinkTemperature"),
    workingMode: fieldDisplay(fields, "workingMode"),
    faultId: fieldValue(fields, "faultID"),
    batteryVoltage: fieldValue(fields, "batteryVoltage"),
    acOutputFrequency: fieldValue(fields, "acOutputFrequency"),
    todayPvGen: fieldValue(fields, "pvGeneratedEnergyOfDay"),
    todayLoadConsumed: fieldValue(fields, "loadConsumedEnergyOfDay"),
    todayBattDischarge: fieldValue(fields, "batteryDischargeOfThisDay"),
    loadPercentage: fieldValue(fields, "loadPercentage"),
    batteryHoursLeft: batteryDischarging
      ? estimateBatteryHours(
          soc,
          Math.abs(batteryPower),
          settings.batteryCapacityKwh,
          fieldValue(fields, "batteryVoltage"),
          fieldValue(fields, "batteryDischargeCurrent")
        )
      : null,
  };
}

export function deriveSummary(fields: FieldMap, settings: UserSettings): DerivedSummary {
  const s = deriveState(fields, settings);

  if (s.faultId !== 0) {
    return { tone: "bad", message: `System fault \u2014 code #${s.faultId}. Check inverter.` };
  }

  if (s.gridOn && s.batteryCharging) {
    const hours = estimateBatteryHours(
      100 - s.soc,
      s.batteryPower,
      settings.batteryCapacityKwh,
      fieldValue(fields, "batteryVoltage"),
      fieldValue(fields, "batteryChargingCurrent")
    );
    const eta = hours ? ` \u2014 full in ~${hours.toFixed(1)}h` : "";
    return { tone: "good", message: `Grid is on. Battery charging${eta}.` };
  }

  if (s.gridOn) {
    return { tone: "good", message: "Running on grid power." };
  }

  if (!s.gridOn && s.pvPower > s.loadPower && s.pvPower > 0.05) {
    return { tone: "good", message: "Solar is covering everything." };
  }

  if (!s.gridOn && s.pvPower > 0.05) {
    return { tone: "warm", message: "Running on solar + battery." };
  }

  if (!s.gridOn && s.batteryDischarging && s.soc < settings.lowBatteryThreshold) {
    return { tone: "bad", message: `Grid is out \u2014 battery low at ${s.soc}%.` };
  }

  if (!s.gridOn && s.batteryDischarging) {
    const hrs = s.batteryHoursLeft;
    const est = hrs ? ` (~${hrs.toFixed(1)}h left)` : "";
    return { tone: "warm", message: `Grid is out \u2014 running on battery${est}.` };
  }

  return { tone: "neutral", message: "Standby." };
}
