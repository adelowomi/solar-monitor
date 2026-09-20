import { describe, it, expect } from "vitest";
import { parseAlertEvent, shouldSound, shouldClaimEventId } from "./events";
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

describe("shouldClaimEventId", () => {
  const evt = (over = {}) => parseAlertEvent(JSON.stringify({ ...base, ...over }))!;

  it("claims when armed and the event sounds", () => {
    expect(shouldClaimEventId(evt(), DEFAULT_SETTINGS, true)).toBe(true);
  });

  it("does NOT claim when disarmed, even though the event would sound", () => {
    // The disarmed tab makes no noise. If it claimed the id, the service worker
    // would suppress its push and the device would get nothing at all.
    expect(shouldClaimEventId(evt(), DEFAULT_SETTINGS, false)).toBe(false);
  });

  it("does NOT claim an event this device has muted, even when armed", () => {
    expect(shouldClaimEventId(evt({ type: "grid_restored" }), DEFAULT_SETTINGS, true)).toBe(false);
  });

  it("does NOT claim a stale replayed event", () => {
    const stale = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(shouldClaimEventId(evt({ replay: true, occurredAt: stale }), DEFAULT_SETTINGS, true)).toBe(false);
  });
});
