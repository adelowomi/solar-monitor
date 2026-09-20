import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// The service worker cannot import bundled code, so it inlines its own copy of
// the dedupe store. If these constants ever drift, a push and its replayed SSE
// twin would both alarm — the exact thing this store exists to prevent.
describe("seen store duplication", () => {
  const read = (p: string) => readFileSync(resolve(__dirname, p), "utf8");

  it("uses the same database name, version and store in both copies", () => {
    const lib = read("./seen-idb.ts");
    const sw = read("../../public/sw.js");

    const pick = (s: string, re: RegExp) => re.exec(s)?.[1];
    expect(pick(sw, /DB_NAME = "([^"]+)"/)).toBe(pick(lib, /DB_NAME = "([^"]+)"/));
    expect(pick(sw, /STORE = "([^"]+)"/)).toBe(pick(lib, /STORE = "([^"]+)"/));
    expect(pick(sw, /indexedDB\.open\([^,]+,\s*(\d+)\)/)).toBe(
      pick(lib, /indexedDB\.open\([^,]+,\s*(\d+)\)/)
    );
    expect(pick(sw, /MAX_AGE_MS = ([0-9_ *]+);/)?.replace(/\s/g, "")).toBe(
      pick(lib, /MAX_AGE_MS = ([0-9_ *]+);/)?.replace(/\s/g, "")
    );
  });
});
