import { useState, useCallback, useRef } from "react";

const STORAGE_KEY = "sunhouse_power_history";
const SAMPLE_INTERVAL_MS = 1 * 60 * 1000; // 1 minute
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface HistoryPoint {
  time: number; // epoch ms
  load: number;
  battery: number;
  grid: number;
  solar: number;
}

function loadFromStorage(): HistoryPoint[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryPoint[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveToStorage(points: HistoryPoint[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(points));
  } catch {
    // storage full or unavailable - silently ignore
  }
}

function prune(points: HistoryPoint[]): HistoryPoint[] {
  const cutoff = Date.now() - MAX_AGE_MS;
  return points.filter((p) => p.time >= cutoff);
}

export function useLocalHistory() {
  const [history, setHistory] = useState<HistoryPoint[]>(() => prune(loadFromStorage()));
  const lastRecordTime = useRef<number>(
    history.length > 0 ? history[history.length - 1].time : 0,
  );

  const record = useCallback(
    (fields: { load: number; battery: number; grid: number; solar: number }) => {
      const now = Date.now();
      if (now - lastRecordTime.current < SAMPLE_INTERVAL_MS) return;

      lastRecordTime.current = now;
      const point: HistoryPoint = { time: now, ...fields };

      setHistory((prev) => {
        const next = prune([...prev, point]);
        saveToStorage(next);
        return next;
      });
    },
    [],
  );

  return { history, record } as const;
}
