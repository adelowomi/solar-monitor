import type { AlarmTone } from "../api/types";

interface ToneSpec {
  /** [frequency Hz, seconds] pairs, looped for the alarm's duration. */
  pattern: [number, number][];
  type: OscillatorType;
}

const TONES: Record<AlarmTone, ToneSpec> = {
  siren: { pattern: [[880, 0.4], [620, 0.4]], type: "square" },
  chime: { pattern: [[660, 0.18], [880, 0.35], [0, 0.6]], type: "sine" },
  pulse: { pattern: [[740, 0.15], [0, 0.35]], type: "triangle" },
  alert: { pattern: [[980, 0.1], [0, 0.1], [980, 0.1], [0, 0.5]], type: "sawtooth" },
};

export interface Alarm {
  unlock(): Promise<boolean>;
  isArmed(): boolean;
  play(tone: AlarmTone, durationMs: number, volume: number): void;
  stop(): void;
  onStateChange(cb: (armed: boolean) => void): () => void;
}

export function createAlarm(): Alarm {
  let ctx: AudioContext | null = null;
  let stopAt = 0;
  let timer: number | null = null;
  let active: { osc: OscillatorNode; gain: GainNode } | null = null;
  const listeners = new Set<(armed: boolean) => void>();

  const armed = () => ctx !== null && ctx.state === "running";
  const announce = () => listeners.forEach((cb) => cb(armed()));

  async function unlock(): Promise<boolean> {
    try {
      ctx ??= new AudioContext();
      if (ctx.state === "suspended") await ctx.resume();
      // A zero-length silent buffer satisfies the gesture requirement.
      const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
      ctx.onstatechange = announce;
      announce();
      return armed();
    } catch {
      announce();
      return false;
    }
  }

  function stop(): void {
    if (timer !== null) { clearTimeout(timer); timer = null; }
    if (active) {
      try { active.osc.stop(); } catch { /* already stopped */ }
      active.osc.disconnect();
      active.gain.disconnect();
      active = null;
    }
  }

  function play(tone: AlarmTone, durationMs: number, volume: number): void {
    if (!ctx || ctx.state !== "running") return;
    stop();

    const spec = TONES[tone] ?? TONES.siren;
    // A pattern that cannot advance time would spin the scheduler forever.
    if (spec.pattern.length === 0) return;
    const MIN_SEGMENT_SECONDS = 0.01;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = spec.type;
    osc.connect(gain);

    let t = ctx.currentTime;
    stopAt = t + durationMs / 1000;
    while (t < stopAt) {
      for (const [freq, secs] of spec.pattern) {
        if (t >= stopAt) break;
        const step = Math.max(MIN_SEGMENT_SECONDS, secs);
        osc.frequency.setValueAtTime(freq || 0.0001, t);
        gain.gain.setValueAtTime(freq === 0 ? 0 : volume, t);
        t += step;
      }
    }
    gain.gain.setValueAtTime(0, stopAt);

    osc.start();
    osc.stop(stopAt + 0.05);
    active = { osc, gain };
    timer = window.setTimeout(stop, durationMs + 100);
  }

  return {
    unlock,
    isArmed: armed,
    play,
    stop,
    onStateChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
}
