import { describe, it, expect, beforeEach } from "vitest";
import { markSeen, __resetSeen } from "./seen";

describe("markSeen", () => {
  beforeEach(() => __resetSeen());

  it("returns true the first time and false afterwards", async () => {
    expect(await markSeen("evt-1")).toBe(true);
    expect(await markSeen("evt-1")).toBe(false);
  });

  it("tracks ids independently", async () => {
    expect(await markSeen("evt-1")).toBe(true);
    expect(await markSeen("evt-2")).toBe(true);
  });

  it("falls back to memory when IndexedDB is unavailable", async () => {
    const original = globalThis.indexedDB;
    // @ts-expect-error deliberately removing the API
    delete globalThis.indexedDB;
    __resetSeen();

    expect(await markSeen("evt-idb")).toBe(true);
    expect(await markSeen("evt-idb")).toBe(false);

    globalThis.indexedDB = original;
  });
});
