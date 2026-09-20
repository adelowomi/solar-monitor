export interface SseFrame {
  id?: string;
  event?: string;
  data: string;
}

/**
 * Incremental text/event-stream parser. Network chunks split frames at
 * arbitrary points, so partial input is buffered until a blank line closes
 * the frame.
 */
export class SseParser {
  private buffer = "";

  push(chunk: string): SseFrame[] {
    this.buffer += chunk;
    // Normalise across the whole buffer, never per chunk: a CRLF split across a
    // chunk boundary would otherwise strand a \r inside a field value. Re-running
    // this over the full buffer repairs the orphan once its \n arrives.
    this.buffer = this.buffer.replace(/\r\n/g, "\n");
    const frames: SseFrame[] = [];

    let boundary = this.buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const raw = this.buffer.slice(0, boundary);
      this.buffer = this.buffer.slice(boundary + 2);
      const frame = parseFrame(raw);
      if (frame) frames.push(frame);
      boundary = this.buffer.indexOf("\n\n");
    }

    // A stream that never terminates a frame must not grow the buffer forever.
    const MAX_BUFFER = 1_000_000;
    if (this.buffer.length > MAX_BUFFER) this.buffer = "";

    return frames;
  }
}

function parseFrame(raw: string): SseFrame | null {
  let id: string | undefined;
  let event: string | undefined;
  const data: string[] = [];

  for (const line of raw.split("\n")) {
    if (line === "" || line.startsWith(":")) continue;
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    const value = colon === -1 ? "" : line.slice(colon + 1).replace(/^ /, "");

    if (field === "id") id = value;
    else if (field === "event") event = value;
    else if (field === "data") data.push(value);
  }

  // Keep id-only frames: dropping them would lose the id that Last-Event-ID
  // resumption depends on. A comment-only frame still yields nothing.
  if (data.length === 0 && id === undefined) return null;
  return { id, event, data: data.join("\n") };
}
