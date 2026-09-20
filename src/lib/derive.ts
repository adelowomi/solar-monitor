import type { CurrentReadingDto } from "../api/sunhouse";
import type { UserSettings, DerivedSummary } from "../api/types";

export interface FlowInfo {
  flowDirection: number | null;
  isLight: boolean;
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
  todayGridConsumed: number;
  loadPercentage: number;
  batteryHoursLeft: number | null;
  pvPanelFlow: FlowInfo;
  gridFlow: FlowInfo;
  batteryFlow: FlowInfo;
  loadFlow: FlowInfo;
}

const n = (v: number | undefined | null): number => v ?? 0;
const b = (v: boolean | undefined | null): boolean => v ?? false;

export function estimateBatteryHours(
  socPct: number,
  dischargeKw: number,
  capacityKwh: number,
): number | null {
  if (dischargeKw <= 0.01) return null;
  const usableKwh = capacityKwh * (socPct / 100);
  return usableKwh / dischargeKw;
}

const POWER_EPSILON = 0.05;

export function deriveStateFromReading(r: CurrentReadingDto, settings: UserSettings): DerivedState {
  const soc = n(r.batterySoc);
  const batteryPower = n(r.batteryPowerKw);
  const batteryDischarging = batteryPower < -POWER_EPSILON;
  const batteryCharging = batteryPower > POWER_EPSILON;
  const pvPower = n(r.generationPowerKw);
  const loadPower = n(r.totalActivePowerKw);
  const acInputPower = n(r.acInputPowerKw);
  const gridOn = b(r.gridOn);

  return {
    soc,
    batteryPower,
    batteryCharging,
    batteryDischarging,
    pvPower,
    loadPower,
    acInputVoltage: n(r.acInputVoltage),
    acInputPower,
    gridOn,
    heatSinkTemp: n(r.maxHeatSinkTempC),
    workingMode: r.workingMode ?? "—",
    faultId: n(r.faultId),
    batteryVoltage: n(r.batteryVoltage),
    acOutputFrequency: n(r.acInputFrequency),
    todayPvGen: n(r.pvGeneratedEnergyOfDayKwh),
    todayLoadConsumed: n(r.loadConsumedEnergyOfDayKwh),
    todayBattDischarge: n(r.batteryDischargeOfDayKwh),
    todayGridConsumed: n(r.consumedEnergyFromGridOfDayKwh),
    loadPercentage: n(r.loadPercentage),
    batteryHoursLeft: batteryDischarging
      ? estimateBatteryHours(soc, Math.abs(batteryPower), settings.batteryCapacityKwh)
      : null,
    pvPanelFlow: { flowDirection: pvPower > POWER_EPSILON ? 2 : null, isLight: pvPower > POWER_EPSILON },
    gridFlow: { flowDirection: gridOn && acInputPower > POWER_EPSILON ? 1 : null, isLight: gridOn },
    batteryFlow: {
      flowDirection: batteryCharging ? 1 : batteryDischarging ? 2 : null,
      isLight: batteryCharging || batteryDischarging,
    },
    loadFlow: { flowDirection: loadPower > POWER_EPSILON ? 2 : null, isLight: loadPower > POWER_EPSILON },
  };
}

export function deriveSummary(state: DerivedState, settings: UserSettings): DerivedSummary {
  const s = state;
  if (s.faultId !== 0) return { tone: "bad", message: `System fault — code #${s.faultId}. Check inverter.` };
  if (s.gridOn && s.batteryCharging) {
    const hours = estimateBatteryHours(100 - s.soc, s.batteryPower, settings.batteryCapacityKwh);
    const eta = hours ? ` — full in ~${hours.toFixed(1)}h` : "";
    return { tone: "good", message: `Grid is on. Battery charging${eta}.` };
  }
  if (s.gridOn) return { tone: "good", message: "Running on grid power." };
  if (!s.gridOn && s.pvPower > s.loadPower && s.pvPower > POWER_EPSILON)
    return { tone: "good", message: "Solar is covering everything." };
  if (!s.gridOn && s.pvPower > POWER_EPSILON) return { tone: "warm", message: "Running on solar + battery." };
  if (!s.gridOn && s.batteryDischarging) {
    const hrs = s.batteryHoursLeft;
    const est = hrs ? ` (~${hrs.toFixed(1)}h left)` : "";
    return { tone: "warm", message: `Grid is out — running on battery${est}.` };
  }
  return { tone: "neutral", message: "Standby." };
}
