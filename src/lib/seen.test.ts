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
});
