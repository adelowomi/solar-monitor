import { useState } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { SolarTimePoint } from "../api/endpoints";
import type { HistoryPoint } from "../hooks/useLocalHistory";

const COLORS = {
  solar: "#fbbf24",
  battery: "#34d399",
  grid: "#38bdf8",
  load: "#a78bfa",
} as const;

const TAB_BASE =
  "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors";
const TAB_ACTIVE = `${TAB_BASE} bg-white/10 text-white`;
const TAB_INACTIVE = `${TAB_BASE} text-white/40 hover:text-white/60`;

interface Props {
  solarHistory: SolarTimePoint[];
  solarLoading: boolean;
  localHistory: HistoryPoint[];
}

type Tab = "solar" | "power";

function formatLocalTime(epoch: number): string {
  const d = new Date(epoch);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function PowerHistory({ solarHistory, solarLoading, localHistory }: Props) {
  const [tab, setTab] = useState<Tab>("solar");

  return (
    <div className="rounded-3xl bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm p-6 mb-6">
      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4">
        <button
          className={tab === "solar" ? TAB_ACTIVE : TAB_INACTIVE}
          onClick={() => setTab("solar")}
        >
          Solar (Today)
        </button>
        <button
          className={tab === "power" ? TAB_ACTIVE : TAB_INACTIVE}
          onClick={() => setTab("power")}
        >
          Power (24h)
        </button>
      </div>

      {tab === "solar" ? (
        <SolarChart data={solarHistory} loading={solarLoading} />
      ) : (
        <LocalChart data={localHistory} />
      )}
    </div>
  );
}

/* ---------- Solar Tab ---------- */

function SolarChart({
  data,
  loading,
}: {
  data: SolarTimePoint[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="h-48 flex items-center justify-center text-white/30 text-sm">
        Loading solar history...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-white/30 text-sm">
        No solar data for today.
      </div>
    );
  }

  const chartData = data.map((p) => ({
    time: p.timeDisplay,
    kW: p.value,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
        <defs>
          <linearGradient id="solarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.solar} stopOpacity={0.3} />
            <stop offset="95%" stopColor={COLORS.solar} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="time"
          tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          interval={5}
        />
        <YAxis
          tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          unit=" kW"
          width={54}
        />
        <Tooltip
          contentStyle={{
            background: "rgba(15,23,42,0.9)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "rgba(255,255,255,0.6)" }}
          itemStyle={{ fontVariantNumeric: "tabular-nums" }}
        />
        <Area
          type="monotone"
          dataKey="kW"
          stroke={COLORS.solar}
          fill="url(#solarGrad)"
          strokeWidth={2}
          dot={false}
          name="Solar"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ---------- Local / Power Tab ---------- */

function LocalChart({ data }: { data: HistoryPoint[] }) {
  if (data.length < 2) {
    return (
      <div className="h-48 flex items-center justify-center text-white/30 text-sm">
        Not enough data yet. Readings are sampled every 5 minutes.
      </div>
    );
  }

  const chartData = data.map((p) => ({
    time: formatLocalTime(p.time),
    Load: p.load,
    Battery: Math.abs(p.battery),
    Grid: p.grid,
    Solar: p.solar,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="time"
          tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          interval={Math.max(0, Math.floor(chartData.length / 8) - 1)}
        />
        <YAxis
          tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          unit=" kW"
          width={54}
        />
        <Tooltip
          contentStyle={{
            background: "rgba(15,23,42,0.9)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "rgba(255,255,255,0.6)" }}
          itemStyle={{ fontVariantNumeric: "tabular-nums" }}
        />
        <Line type="monotone" dataKey="Load" stroke={COLORS.load} strokeWidth={1.5} dot={false} />
        <Line type="monotone" dataKey="Battery" stroke={COLORS.battery} strokeWidth={1.5} dot={false} />
        <Line type="monotone" dataKey="Grid" stroke={COLORS.grid} strokeWidth={1.5} dot={false} />
        <Line type="monotone" dataKey="Solar" stroke={COLORS.solar} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
