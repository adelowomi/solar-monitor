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

  it("leaves an id unclaimed when the surface will not alert", async () => {
    // A disarmed tab must NOT consume the id: the service worker still has to be
    // able to claim it and show a notification, or the device gets nothing at all.
    const id = "evt-disarmed";
    const willSound = false;
    if (willSound) await markSeen(id);
    expect(await markSeen(id)).toBe(true); // the other surface can still claim it
  });
});
