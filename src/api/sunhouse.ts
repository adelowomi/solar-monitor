import createClient from "openapi-fetch";
import type { paths, components } from "./generated/schema";

export type Schemas = components["schemas"];

export type CurrentReadingDto = Schemas["CurrentReadingDto"];
export type DailyStatDto = Schemas["DailyStatDto"];
export type MonthSummaryDto = Schemas["MonthSummaryDto"];
export type YearSummaryDto = Schemas["YearSummaryDto"];
export type OutageEventDto = Schemas["OutageEventDto"];
export type SamplePointDto = Schemas["SamplePointDto"];
export type OutageSummaryDto = Schemas["OutageSummaryDto"];
export type OutageHeatmapDto = Schemas["OutageHeatmapDto"];
export type SavingsDto = Schemas["SavingsDto"];
export type ConsumptionDto = Schemas["ConsumptionDto"];
export type ConsumptionDayDto = Schemas["ConsumptionDayDto"];
export type ConsumptionTodayDto = Schemas["ConsumptionTodayDto"];
export type StringAnomalyReportDto = Schemas["StringAnomalyReportDto"];
export type StringAnomalyDayDto = Schemas["StringAnomalyDayDto"];
export type BatteryHealthDto = Schemas["BatteryHealthDto"];
export type OvernightForecastDto = Schemas["OvernightForecastDto"];
export type PerformanceRatioDto = Schemas["PerformanceRatioDto"];
export type RecordsDto = Schemas["RecordsDto"];
export type RecordDto = Schemas["RecordDto"];
export type PollerStatusDto = Schemas["PollerStatusDto"];
export type ConfigurationDto = Schemas["ConfigurationDto"];
export type UpdateConfigurationRequest = Schemas["UpdateConfigurationRequest"];
export type SetCredentialsRequest = Schemas["SetCredentialsRequest"];
export type TestEmailRequest = Schemas["TestEmailRequest"];
export type EmailSentDto = Schemas["EmailSentDto"];

export class SunhouseApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

interface Envelope<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
  statusCode: number;
}

export interface SunhouseClientOptions {
  baseUrl: string;
  apiKey: string;
}

function unwrap<T>(raw: unknown, status: number): T {
  if (status === 401) throw new SunhouseApiError("UNAUTHORIZED", "Invalid or missing API key", 401);
  if (status === 403) throw new SunhouseApiError("FORBIDDEN", "Forbidden", 403);
  if (status === 429) throw new SunhouseApiError("RATE_LIMITED", "Too many requests", 429);
  const envelope = raw as Envelope<T> | undefined;
  if (!envelope) throw new SunhouseApiError("EMPTY_RESPONSE", `No response body (HTTP ${status})`, status);
  if (!envelope.success) {
    throw new SunhouseApiError(
      envelope.error?.code ?? "UNKNOWN",
      envelope.error?.message ?? envelope.message ?? `Request failed (HTTP ${status})`,
      status,
    );
  }
  return envelope.data as T;
}

export function createSunhouseClient({ baseUrl, apiKey }: SunhouseClientOptions) {
  const trimmed = baseUrl.replace(/\/$/, "");
  const fetch = createClient<paths>({
    baseUrl: trimmed,
    headers: { "X-Api-Key": apiKey },
  });

  return {
    current: async () => {
      const { data, response } = await fetch.GET("/api/v1/current");
      return unwrap<CurrentReadingDto>(data, response.status);
    },
    listDays: async (from: string, to: string) => {
      const { data, response } = await fetch.GET("/api/v1/days", { params: { query: { from, to } } });
      return unwrap<DailyStatDto[]>(data, response.status);
    },
    getDay: async (date: string) => {
      const { data, response } = await fetch.GET("/api/v1/days/{date}", { params: { path: { date } } });
      return unwrap<DailyStatDto>(data, response.status);
    },
    listOutages: async (from: string, to: string) => {
      const { data, response } = await fetch.GET("/api/v1/outages", { params: { query: { from, to } } });
      return unwrap<OutageEventDto[]>(data, response.status);
    },
    listSamples: async (from: string, to: string, maxPoints = 500) => {
      const { data, response } = await fetch.GET("/api/v1/samples", {
        params: { query: { from, to, maxPoints } },
      });
      return unwrap<SamplePointDto[]>(data, response.status);
    },

    // Analytics
    outageSummary: async (from: string, to: string) => {
      const { data, response } = await fetch.GET("/api/v1/analytics/outages/summary", {
        params: { query: { from, to } },
      });
      return unwrap<OutageSummaryDto>(data, response.status);
    },
    outageHeatmap: async (from: string, to: string) => {
      const { data, response } = await fetch.GET("/api/v1/analytics/outages/heatmap", {
        params: { query: { from, to } },
      });
      return unwrap<OutageHeatmapDto>(data, response.status);
    },
    savings: async (from: string, to: string) => {
      const { data, response } = await fetch.GET("/api/v1/analytics/savings", {
        params: { query: { from, to } },
      });
      return unwrap<SavingsDto>(data, response.status);
    },
    consumption: async (days = 30) => {
      const { data, response } = await fetch.GET("/api/v1/analytics/consumption", {
        params: { query: { days } },
      });
      return unwrap<ConsumptionDto>(data, response.status);
    },
    stringAnomalies: async (from: string, to: string) => {
      const { data, response } = await fetch.GET("/api/v1/analytics/strings/anomalies", {
        params: { query: { from, to } },
      });
      return unwrap<StringAnomalyReportDto>(data, response.status);
    },
    batteryHealth: async () => {
      const { data, response } = await fetch.GET("/api/v1/analytics/battery/health");
      return unwrap<BatteryHealthDto>(data, response.status);
    },
    forecastOvernight: async () => {
      const { data, response } = await fetch.GET("/api/v1/analytics/forecast/overnight");
      return unwrap<OvernightForecastDto>(data, response.status);
    },
    performance: async (date: string) => {
      const { data, response } = await fetch.GET("/api/v1/analytics/performance/{date}", {
        params: { path: { date } },
      });
      return unwrap<PerformanceRatioDto>(data, response.status);
    },
    records: async () => {
      const { data, response } = await fetch.GET("/api/v1/analytics/records");
      return unwrap<RecordsDto>(data, response.status);
    },

    // Configuration
    getConfiguration: async () => {
      const { data, response } = await fetch.GET("/api/v1/configuration");
      return unwrap<ConfigurationDto>(data, response.status);
    },
    updateConfiguration: async (patch: UpdateConfigurationRequest) => {
      const { data, response } = await fetch.PATCH("/api/v1/configuration", { body: patch });
      return unwrap<ConfigurationDto>(data, response.status);
    },

    // Poller
    pollerStatus: async () => {
      const { data, response } = await fetch.GET("/api/v1/poller/status");
      return unwrap<PollerStatusDto>(data, response.status);
    },
    setPollerCredentials: async (req: SetCredentialsRequest) => {
      const { data, response } = await fetch.POST("/api/v1/poller/credentials", { body: req });
      return unwrap<PollerStatusDto>(data, response.status);
    },
    triggerPoll: async () => {
      const { data, response } = await fetch.POST("/api/v1/poller/refresh");
      return unwrap<PollerStatusDto>(data, response.status);
    },

    // Email
    sendTestEmail: async (req: TestEmailRequest) => {
      const { data, response } = await fetch.POST("/api/v1/email/test", { body: req });
      return unwrap<EmailSentDto>(data, response.status);
    },

    exportDaysCsvUrl: (from: string, to: string) =>
      `${trimmed}/api/v1/export/days.csv?from=${from}&to=${to}`,
  };
}

export type SunhouseClient = ReturnType<typeof createSunhouseClient>;
