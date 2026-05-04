import { describe, it, expect } from "vitest";
import { deriveSummary } from "../lib/derive";
import type { FieldMap, UserSettings } from "../api/types";
import { DEFAULT_SETTINGS } from "../api/types";

function makeFields(overrides: Record<string, number | string>): FieldMap {
  const fields: FieldMap = {};
  for (const [key, value] of Object.entries(overrides)) {
    fields[key] = {
      key,
      unit: "",
      value,
      valueDisplay: String(value),
      isHidden: false,
      nameDisplay: key,
    };
  }
  return fields;
}

const settings: UserSettings = { ...DEFAULT_SETTINGS };

describe("deriveSummary", () => {
  it("detects system fault", () => {
    const fields = makeFields({ faultID: 42 });
    const result = deriveSummary(fields, settings);
    expect(result.tone).toBe("bad");
    expect(result.message).toContain("fault");
    expect(result.message).toContain("#42");
  });

  it("grid on + battery charging", () => {
    const fields = makeFields({
      faultID: 0,
      acInputVoltage: 230,
      lineConnectionStatus: "1",
      batteryPower: 0.5,
      batterySOC: 60,
      generationPower: 0,
      totalActivePower: 0.3,
    });
    const result = deriveSummary(fields, settings);
    expect(result.tone).toBe("good");
    expect(result.message).toContain("Grid is on");
    expect(result.message).toContain("charging");
  });

  it("grid on + battery idle", () => {
    const fields = makeFields({
      faultID: 0,
      acInputVoltage: 230,
      lineConnectionStatus: "1",
      batteryPower: 0,
      batterySOC: 100,
      generationPower: 0,
      totalActivePower: 0.3,
    });
    const result = deriveSummary(fields, settings);
    expect(result.tone).toBe("good");
    expect(result.message).toBe("Running on grid power.");
  });

  it("grid off + solar covers load", () => {
    const fields = makeFields({
      faultID: 0,
      acInputVoltage: 0,
      lineConnectionStatus: "0",
      batteryPower: 0.2,
      batterySOC: 80,
      generationPower: 2.0,
      totalActivePower: 1.5,
    });
    const result = deriveSummary(fields, settings);
    expect(result.tone).toBe("good");
    expect(result.message).toContain("Solar is covering everything");
  });

  it("grid off + solar partial", () => {
    const fields = makeFields({
      faultID: 0,
      acInputVoltage: 0,
      lineConnectionStatus: "0",
      batteryPower: -0.5,
      batterySOC: 60,
      generationPower: 0.3,
      totalActivePower: 1.0,
    });
    const result = deriveSummary(fields, settings);
    expect(result.tone).toBe("warm");
    expect(result.message).toContain("solar + battery");
  });

  it("grid off + battery only, low SOC", () => {
    const fields = makeFields({
      faultID: 0,
      acInputVoltage: 0,
      lineConnectionStatus: "0",
      batteryPower: -0.8,
      batterySOC: 12,
      generationPower: 0,
      totalActivePower: 0.8,
    });
    const result = deriveSummary(fields, settings);
    expect(result.tone).toBe("bad");
    expect(result.message).toContain("battery low");
    expect(result.message).toContain("12%");
  });

  it("grid off + battery only, healthy SOC", () => {
    const fields = makeFields({
      faultID: 0,
      acInputVoltage: 0,
      lineConnectionStatus: "0",
      batteryPower: -0.8,
      batterySOC: 70,
      generationPower: 0,
      totalActivePower: 0.8,
    });
    const result = deriveSummary(fields, settings);
    expect(result.tone).toBe("warm");
    expect(result.message).toContain("running on battery");
    expect(result.message).toContain("h left");
  });

  it("standby", () => {
    const fields = makeFields({
      faultID: 0,
      acInputVoltage: 0,
      lineConnectionStatus: "0",
      batteryPower: 0,
      batterySOC: 50,
      generationPower: 0,
      totalActivePower: 0,
    });
    const result = deriveSummary(fields, settings);
    expect(result.tone).toBe("neutral");
    expect(result.message).toBe("Standby.");
  });
});
