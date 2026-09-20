import { describe, it, expect } from "vitest";
import { parseAlertEvent, shouldSound } from "./events";
import { DEFAULT_SETTINGS } from "./types";

const base = {
  id: "evt-1",
  type: "grid_lost",
  occurredAt: new Date().toISOString(),
  severity: "critical",
  title: "Grid lost",
  body: "Mains dropped.",
  replay: false,
  sample: {
    gridOn: false, batterySoc: 80, generationPowerKw: 1.2,
    totalActivePowerKw: 0.9, faultId: 0, acInputVoltage: 0, maxHeatSinkTempC: 44,
  },
};

describe("parseAlertEvent", () => {
  it("parses a valid payload", () => {
    expect(parseAlertEvent(JSON.stringify(base))?.type).toBe("grid_lost");
  });

  it("returns null for malformed JSON", () => {
    expect(parseAlertEvent("{not json")).toBeNull();
  });

  it("returns null for an unknown event type", () => {
    expect(parseAlertEvent(JSON.stringify({ ...base, type: "wat" }))).toBeNull();
  });
});

describe("shouldSound", () => {
  it("sounds grid_lost by default", () => {
    expect(shouldSound(parseAlertEvent(JSON.stringify(base))!, DEFAULT_SETTINGS)).toBe(true);
  });

  it("does not sound grid_restored by default", () => {
    const e = parseAlertEvent(JSON.stringify({ ...base, type: "grid_restored" }))!;
    expect(shouldSound(e, DEFAULT_SETTINGS)).toBe(false);
  });

  it("sounds a fresh replayed event", () => {
    const e = parseAlertEvent(JSON.stringify({ ...base, replay: true }))!;
    expect(shouldSound(e, DEFAULT_SETTINGS)).toBe(true);
  });

  it("does not sound a replayed event older than two minutes", () => {
    const stale = new Date(Date.now() - 5 * 60_000).toISOString();
    const e = parseAlertEvent(JSON.stringify({ ...base, replay: true, occurredAt: stale }))!;
    expect(shouldSound(e, DEFAULT_SETTINGS)).toBe(false);
  });

  it("still sounds a live event older than two minutes", () => {
    const stale = new Date(Date.now() - 5 * 60_000).toISOString();
    const e = parseAlertEvent(JSON.stringify({ ...base, occurredAt: stale }))!;
    expect(shouldSound(e, DEFAULT_SETTINGS)).toBe(true);
  });
});
