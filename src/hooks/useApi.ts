import { useMemo } from "react";
import { createSunhouseClient, type SunhouseClient } from "../api/sunhouse";

export interface ApiConfig {
  baseUrl: string;
  apiKey: string;
}

function readEnv(): ApiConfig | null {
  const baseUrl = import.meta.env.VITE_SUNHOUSE_API_BASE as string | undefined;
  const apiKey = import.meta.env.VITE_SUNHOUSE_API_KEY as string | undefined;
  if (!baseUrl || !apiKey) return null;
  return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey };
}

export function useApi(): { config: ApiConfig | null; client: SunhouseClient | null } {
  const config = useMemo(() => readEnv(), []);
  const client = useMemo(() => (config ? createSunhouseClient(config) : null), [config]);
  return { config, client };
}
