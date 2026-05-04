import { useState, useEffect, useRef, useCallback } from "react";

interface UsePollingResult<T> {
  data: T | null;
  error: string | null;
  lastUpdate: Date | null;
  refreshing: boolean;
  refetch: () => void;
}

export function usePolling<T>(
  fn: () => Promise<T>,
  intervalMs: number,
  enabled = true
): UsePollingResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const execute = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await fnRef.current();
      setData(result);
      setLastUpdate(new Date());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    execute();

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      intervalId = setInterval(execute, intervalMs);
    };

    const stop = () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        execute();
        start();
      }
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [execute, intervalMs, enabled]);

  return { data, error, lastUpdate, refreshing, refetch: execute };
}
