import { describe, it, expect } from "vitest";
import { SseParser } from "./sse";

describe("SseParser", () => {
  it("parses a complete frame", () => {
    const p = new SseParser();
    const frames = p.push("id: 1\nevent: grid_lost\ndata: {\"a\":1}\n\n");
    expect(frames).toHaveLength(1);
    expect(frames[0]).toEqual({ id: "1", event: "grid_lost", data: '{"a":1}' });
  });

  it("buffers a frame split across chunks", () => {
    const p = new SseParser();
    expect(p.push("id: 1\nevent: grid")).toHaveLength(0);
    expect(p.push("_lost\ndata: {}\n\n")).toEqual([
      { id: "1", event: "grid_lost", data: "{}" },
    ]);
  });

  it("returns multiple frames from one chunk", () => {
    const p = new SseParser();
    const frames = p.push("data: a\n\ndata: b\n\n");
    expect(frames.map((f) => f.data)).toEqual(["a", "b"]);
  });

  it("ignores heartbeat comments", () => {
    const p = new SseParser();
    expect(p.push(": hb\n\n")).toHaveLength(0);
  });

  it("tolerates CRLF line endings", () => {
    const p = new SseParser();
    expect(p.push("id: 1\r\ndata: x\r\n\r\n")).toEqual([
      { id: "1", event: undefined, data: "x" },
    ]);
  });

  it("joins multi-line data with newlines per the SSE spec", () => {
    const p = new SseParser();
    expect(p.push("data: one\ndata: two\n\n")[0].data).toBe("one\ntwo");
  });

  it("handles a CRLF terminator split across chunks", () => {
    const p = new SseParser();
    expect(p.push("data: x\r")).toHaveLength(0);
    expect(p.push("\n\r\n")).toEqual([{ id: undefined, event: undefined, data: "x" }]);
  });
});
