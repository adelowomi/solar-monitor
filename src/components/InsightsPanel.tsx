import { useEffect, useMemo, useState } from "react";
import {
  X,
  Sun,
  Plug,
  Wallet,
  Battery,
  Moon,
  Activity,
  Trophy,
  Home,
  AlertTriangle,
  Download,
  RefreshCw,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  BatteryHealthDto,
  ConsumptionDto,
  DailyStatDto,
  OutageHeatmapDto,
  OutageSummaryDto,
  OvernightForecastDto,
  PerformanceRatioDto,
  RecordsDto,
  SavingsDto,
  StringAnomalyReportDto,
  SunhouseClient,
} from "../api/sunhouse";

interface InsightsPanelProps {
  open: boolean;
  onClose: () => void;
  client: SunhouseClient;
  apiBase: string;
}

type TabKey =
  | "consumption"
  | "history"
  | "savings"
  | "outages"
  | "battery"
  | "forecast"
  | "performance"
  | "anomalies"
  | "records";

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "consumption", label: "Consumption", icon: Home },
  { key: "history", label: "History", icon: Sun },
  { key: "savings", label: "Savings", icon: Wallet },
  { key: "outages", label: "Outages", icon: Plug },
  { key: "battery", label: "Battery", icon: Battery },
  { key: "forecast", label: "Forecast", icon: Moon },
  { key: "performance", label: "Performance", icon: Activity },
  { key: "anomalies", label: "Strings", icon: AlertTriangle },
  { key: "records", label: "Records", icon: Trophy },
];

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function InsightsPanel({ open, onClose, client, apiBase }: InsightsPanelProps) {
  const [tab, setTab] = useState<TabKey>("consumption");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full sm:max-w-5xl sm:rounded-3xl rounded-t-3xl bg-slate-950 border border-white/10 max-h-[94vh] overflow-y-auto">
        <header className="flex items-center justify-between p-6 border-b border-white/5 sticky top-0 bg-slate-950 z-10">
          <div>
            <h2 className="font-display text-xl tracking-tight">Insights</h2>
            <p className="text-xs text-slate-500 mt-1">From your Sunhouse history</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <nav className="flex gap-1 px-6 overflow-x-auto py-3 border-b border-white/5 sticky top-[88px] bg-slate-950 z-10">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition ${
                  active
                    ? "bg-white/10 border border-white/15 text-white"
                    : "text-slate-400 hover:text-slate-200 border border-transparent"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </nav>

        <div className="p-6">
          {tab === "consumption" && <ConsumptionTab client={client} />}
          {tab === "history" && <HistoryTab client={client} apiBase={apiBase} />}
          {tab === "savings" && <SavingsTab client={client} />}
          {tab === "outages" && <OutagesTab client={client} />}
          {tab === "battery" && <BatteryTab client={client} />}
          {tab === "forecast" && <ForecastTab client={client} />}
          {tab === "performance" && <PerformanceTab client={client} />}
          {tab === "anomalies" && <AnomaliesTab client={client} />}
          {tab === "records" && <RecordsTab client={client} />}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */

function useAsync<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await load();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading, reload };
}

function StateNotice({ loading, error, empty }: { loading: boolean; error: string | null; empty?: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 py-8">
        <RefreshCw className="w-4 h-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (error) {
    return <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-300">{error}</div>;
  }
  if (empty) {
    return <div className="text-sm text-slate-500 py-6">No data yet — let the poller run a bit longer.</div>;
  }
  return null;
}

function Tile({
  icon,
  label,
  value,
  hint,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-3xl bg-white/[0.04] border border-white/[0.06] p-5">
      <div className="flex items-center gap-2 text-xs tracking-wide text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      <div className="font-display text-2xl mt-2 tabular-nums">{value}</div>
      {hint && <div className="text-[11px] text-slate-500 mt-1">{hint}</div>}
    </div>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white/[0.04] border border-white/[0.06] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm tracking-wide text-slate-400">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* Consumption                                                       */
/* ---------------------------------------------------------------- */

function ConsumptionTab({ client }: { client: SunhouseClient }) {
  const { data, error, loading } = useAsync<ConsumptionDto>(() => client.consumption(30), []);
  if (loading || error || !data) return <StateNotice loading={loading} error={error} empty={!data} />;

  const chart = data.days.map((d) => ({
    label: d.date.slice(5),
    fromSolar: Number(d.fromSolarKwh.toFixed(2)),
    fromBattery: Number(d.fromBatteryKwh.toFixed(2)),
    fromGrid: Number(d.fromGridKwh.toFixed(2)),
  }));

  return (
    <div className="space-y-6">
      {data.today && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Tile
            icon={<Home className="w-4 h-4 text-violet-300" />}
            label="Today so far"
            value={`${data.today.loadKwhSoFar.toFixed(1)} kWh`}
            hint={`${data.today.currentLoadKw.toFixed(2)} kW right now`}
          />
          <Tile
            label="Projected today"
            value={`${data.today.projectedDayLoadKwh.toFixed(1)} kWh`}
            hint={`from ${data.today.elapsedHours.toFixed(1)}h elapsed`}
          />
          <Tile label="7-day avg" value={`${data.avg7DayLoadKwh.toFixed(1)} kWh`} />
          <Tile label="30-day avg" value={`${data.avg30DayLoadKwh.toFixed(1)} kWh`} />
        </div>
      )}

      {data.today && (
        <Section title="Today by source">
          <div className="grid grid-cols-3 gap-4">
            <Tile
              icon={<Sun className="w-4 h-4 text-amber-300" />}
              label="From solar"
              value={`${data.today.fromSolarKwh.toFixed(1)} kWh`}
            />
            <Tile
              icon={<Battery className="w-4 h-4 text-emerald-300" />}
              label="From battery"
              value={`${data.today.fromBatteryKwh.toFixed(1)} kWh`}
            />
            <Tile
              icon={<Plug className="w-4 h-4 text-sky-300" />}
              label="From grid"
              value={`${data.today.fromGridKwh.toFixed(1)} kWh`}
            />
          </div>
        </Section>
      )}

      <Section title="Last 30 days — load by source">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 0, right: 0, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} unit=" kWh" />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                contentStyle={{
                  background: "#0f172a",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="fromSolar" stackId="a" fill="#fbbf24" />
              <Bar dataKey="fromBattery" stackId="a" fill="#34d399" />
              <Bar dataKey="fromGrid" stackId="a" fill="#38bdf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-4 text-xs text-slate-500 mt-4">
          <span><span className="inline-block w-3 h-3 rounded bg-amber-400 mr-1.5 align-middle" />Solar</span>
          <span><span className="inline-block w-3 h-3 rounded bg-emerald-400 mr-1.5 align-middle" />Battery</span>
          <span><span className="inline-block w-3 h-3 rounded bg-sky-400 mr-1.5 align-middle" />Grid</span>
        </div>
      </Section>

      {data.peakDay && (
        <div className="text-xs text-slate-500">
          Peak day: <span className="text-slate-300">{data.peakDay.date}</span> · {data.peakDay.loadKwh.toFixed(1)} kWh
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* History                                                          */
/* ---------------------------------------------------------------- */

function HistoryTab({ client, apiBase }: { client: SunhouseClient; apiBase: string }) {
  const range = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 29);
    return { from: fmtDate(from), to: fmtDate(to) };
  }, []);
  const { data, error, loading } = useAsync<DailyStatDto[]>(() => client.listDays(range.from, range.to), [range.from, range.to]);

  if (loading || error || !data) return <StateNotice loading={loading} error={error} empty={!data} />;
  if (data.length === 0) return <StateNotice loading={false} error={null} empty />;

  const chart = data.map((d) => ({
    label: d.date.slice(5),
    solarKwh: Number(d.solarKwh.toFixed(2)),
    gridHours: Number(d.gridOnHours.toFixed(2)),
  }));
  const csvHref = `${apiBase.replace(/\/$/, "")}/api/v1/export/days.csv?from=${range.from}&to=${range.to}`;
  const totalSolar = data.reduce((a, b) => a + b.solarKwh, 0);
  const totalGrid = data.reduce((a, b) => a + b.gridOnHours, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Tile icon={<Sun className="w-4 h-4 text-amber-300" />} label="Solar" value={`${totalSolar.toFixed(1)} kWh`} hint={`${(totalSolar / data.length).toFixed(1)} kWh/day avg`} />
        <Tile icon={<Plug className="w-4 h-4 text-sky-300" />} label="Grid uptime" value={`${totalGrid.toFixed(0)} h`} hint={`${(totalGrid / data.length).toFixed(1)} h/day avg`} />
        <Tile label="Days" value={`${data.length}`} hint="with data" />
      </div>

      <Section title="Daily solar generation">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 0, right: 0, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} unit=" kWh" />
              <Tooltip cursor={{ fill: "rgba(251,191,36,0.08)" }} contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="solarKwh" fill="#fbbf24" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <Section title="Daily grid uptime">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 0, right: 0, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} unit=" h" domain={[0, 24]} />
              <Tooltip cursor={{ fill: "rgba(56,189,248,0.08)" }} contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="gridHours" fill="#38bdf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <a
        href={csvHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-slate-100 transition text-xs"
      >
        <Download className="w-3.5 h-3.5" /> Export CSV
      </a>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Savings                                                          */
/* ---------------------------------------------------------------- */

function SavingsTab({ client }: { client: SunhouseClient }) {
  const range = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 29);
    return { from: fmtDate(from), to: fmtDate(to) };
  }, []);
  const { data, error, loading } = useAsync<SavingsDto>(() => client.savings(range.from, range.to), [range.from, range.to]);

  if (loading || error || !data) return <StateNotice loading={loading} error={error} empty={!data} />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Tile
          icon={<Wallet className="w-4 h-4 text-emerald-300" />}
          label="Grid bill saved (30d)"
          value={`₦${Math.round(data.gridBillSavedNgn).toLocaleString()}`}
          hint={`₦${Math.round(data.dailyAverageGridBillSavedNgn).toLocaleString()} / day avg`}
        />
        <Tile
          icon={<Wallet className="w-4 h-4 text-amber-300" />}
          label="Diesel-equivalent (30d)"
          value={`₦${Math.round(data.dieselEquivalentSavingsNgn).toLocaleString()}`}
          hint={`if this load came from a generator`}
        />
      </div>

      <Section title="Energy that didn't come from the grid">
        <div className="grid grid-cols-2 gap-4">
          <Tile label="Solar produced" value={`${data.solarKwh.toFixed(1)} kWh`} />
          <Tile label="From battery" value={`${data.batteryDischargeKwh.toFixed(1)} kWh`} />
          <Tile label="Self-consumed" value={`${data.selfConsumedKwh.toFixed(1)} kWh`} />
          <Tile label="From grid" value={`${data.gridConsumedKwh.toFixed(1)} kWh`} />
        </div>
        <p className="text-[11px] text-slate-500 mt-4">
          Tariff: ₦{data.gridTariffNgnPerKwh.toFixed(0)}/kWh grid, ₦{data.dieselTariffNgnPerKwh.toFixed(0)}/kWh diesel-equivalent. Edit via the API settings panel.
        </p>
      </Section>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Outages                                                          */
/* ---------------------------------------------------------------- */

function OutagesTab({ client }: { client: SunhouseClient }) {
  const range = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 29);
    return { from: fmtDate(from), to: fmtDate(to) };
  }, []);
  const summaryQ = useAsync<OutageSummaryDto>(() => client.outageSummary(range.from, range.to), [range.from, range.to]);
  const heatmapQ = useAsync<OutageHeatmapDto>(() => client.outageHeatmap(range.from, range.to), [range.from, range.to]);

  if (summaryQ.loading || heatmapQ.loading) return <StateNotice loading error={null} />;
  if (summaryQ.error || heatmapQ.error) return <StateNotice loading={false} error={summaryQ.error ?? heatmapQ.error} />;
  if (!summaryQ.data || !heatmapQ.data) return <StateNotice loading={false} error={null} empty />;

  const s = summaryQ.data;
  const h = heatmapQ.data;
  const maxCell = h.cells.flat().reduce((a, b) => Math.max(a, b), 0);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Tile label="Outages (30d)" value={`${s.count}`} hint={`${s.openCount} ongoing`} />
        <Tile label="Reliability" value={`${s.reliabilityPercent.toFixed(1)}%`} hint="grid uptime in window" />
        <Tile label="Avg duration" value={`${s.avgDurationMinutes.toFixed(0)} min`} hint={`longest ${s.longestMinutes.toFixed(0)} min`} />
        <Tile
          label="MTBO"
          value={s.meanTimeBetweenOutagesHours == null ? "—" : `${s.meanTimeBetweenOutagesHours.toFixed(1)} h`}
          hint="mean time between outages"
        />
      </div>

      <Section title="When outages start (local time)">
        <div className="overflow-x-auto">
          <table className="text-[10px] w-full">
            <thead>
              <tr>
                <th className="text-left text-slate-500 font-normal pr-2"></th>
                {Array.from({ length: 24 }, (_, h) => (
                  <th key={h} className="text-slate-500 font-normal w-6 text-center pb-1">
                    {h % 3 === 0 ? h : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((label, dow) => (
                <tr key={label}>
                  <td className="text-slate-500 pr-2">{label}</td>
                  {h.cells[dow].map((count, hour) => {
                    const intensity = maxCell === 0 ? 0 : count / maxCell;
                    const bg = count === 0 ? "rgba(255,255,255,0.03)" : `rgba(239, 68, 68, ${0.15 + 0.6 * intensity})`;
                    return (
                      <td key={hour} className="p-0.5">
                        <div
                          className="h-5 rounded-sm flex items-center justify-center text-[9px] tabular-nums text-slate-300"
                          style={{ background: bg }}
                          title={`${label} ${hour}:00 — ${count} outage${count === 1 ? "" : "s"}`}
                        >
                          {count > 0 ? count : ""}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <div className="text-xs text-slate-500">
        Window: {s.from} → {s.to} · {s.totalDowntimeHours.toFixed(1)} h total downtime
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Battery                                                          */
/* ---------------------------------------------------------------- */

function BatteryTab({ client }: { client: SunhouseClient }) {
  const { data, error, loading } = useAsync<BatteryHealthDto>(() => client.batteryHealth(), []);
  if (loading || error || !data) return <StateNotice loading={loading} error={error} empty={!data} />;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Tile label="Nominal capacity" value={`${data.nominalCapacityKwh.toFixed(1)} kWh`} />
        <Tile label="Total cycles (eqv)" value={`${data.totalCyclesEquivalent.toFixed(1)}`} hint={`across ${data.daysObserved} days`} />
        <Tile label="This month" value={`${data.cyclesThisMonth.toFixed(2)}`} />
        <Tile label="Cycles/day avg (30d)" value={`${data.cyclesPerDayAvg30.toFixed(2)}`} />
      </div>
      <Section title="Full-SOC voltage trend">
        <div className="grid grid-cols-3 gap-4">
          <Tile label="Baseline avg" value={data.baselineFullSocVoltageAvg ? `${data.baselineFullSocVoltageAvg.toFixed(2)} V` : "—"} hint="first 30 days" />
          <Tile label="Last 30d avg" value={data.currentFullSocVoltageAvg30 ? `${data.currentFullSocVoltageAvg30.toFixed(2)} V` : "—"} />
          <Tile label="Sag" value={data.voltageSagPercent == null ? "—" : `${data.voltageSagPercent.toFixed(2)}%`} hint="lower is healthier" />
        </div>
        <p className="text-[11px] text-slate-500 mt-4">
          Voltage at a full pack is a proxy for cell degradation. Sustained drift over time is normal; a sudden drop is worth investigating.
        </p>
      </Section>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Overnight forecast                                                */
/* ---------------------------------------------------------------- */

function ForecastTab({ client }: { client: SunhouseClient }) {
  const { data, error, loading } = useAsync<OvernightForecastDto>(() => client.forecastOvernight(), []);
  if (loading || error || !data) return <StateNotice loading={loading} error={error} empty={!data} />;

  const tone =
    data.verdict === "comfortable" ? "text-emerald-300" :
    data.verdict === "tight" ? "text-amber-300" :
    data.verdict === "shortfall" ? "text-red-300" : "text-slate-400";

  return (
    <div className="space-y-6">
      <div className={`text-center font-display text-3xl ${tone}`}>
        {data.verdict === "comfortable" && "You'll make it through the night."}
        {data.verdict === "tight" && "It'll be tight tonight."}
        {data.verdict === "shortfall" && "Expecting a shortfall."}
        {data.verdict === "insufficient_data" && "Not enough overnight history yet."}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Tile label="Battery now" value={`${data.batterySoc.toFixed(0)}%`} hint={`${data.availableBatteryKwh.toFixed(1)} kWh available`} />
        <Tile label="Hours till sunrise" value={`${data.hoursTillSunrise.toFixed(1)} h`} />
        <Tile label="Expected need" value={`${data.expectedRemainingNightKwh.toFixed(1)} kWh`} hint={`from ${data.overnightDaysSampled} prior nights`} />
        <Tile
          label="Margin"
          value={`${data.marginKwh > 0 ? "+" : ""}${data.marginKwh.toFixed(1)} kWh`}
          hint={`${data.marginPercent > 0 ? "+" : ""}${data.marginPercent.toFixed(0)}%`}
        />
      </div>

      <p className="text-[11px] text-slate-500">
        Average overnight kWh last 7 nights: {data.avgOvernightKwhLast7.toFixed(1)} kWh · battery nominal: {data.batteryNominalKwh.toFixed(1)} kWh
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Performance                                                       */
/* ---------------------------------------------------------------- */

function PerformanceTab({ client }: { client: SunhouseClient }) {
  const today = fmtDate(new Date());
  const { data, error, loading } = useAsync<PerformanceRatioDto>(() => client.performance(today), [today]);

  if (loading) return <StateNotice loading error={null} />;
  if (error) return <StateNotice loading={false} error={error} />;
  if (!data) return <StateNotice loading={false} error={null} empty />;

  const pr = data.performanceRatio;
  const tone = pr >= 0.75 ? "text-emerald-300" : pr >= 0.6 ? "text-amber-300" : "text-red-300";

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-xs tracking-wide text-slate-400">Performance ratio · {data.date}</div>
        <div className={`font-display text-5xl mt-3 tabular-nums ${tone}`}>{pr.toFixed(2)}</div>
        <div className="text-xs text-slate-500 mt-1">≥ 0.75 healthy · 0.6–0.75 OK · &lt; 0.6 investigate</div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Tile label="Actual today" value={`${data.solarKwh.toFixed(1)} kWh`} />
        <Tile label="Theoretical" value={`${data.theoreticalKwh.toFixed(1)} kWh`} hint={`${data.installedCapacityKwp} kWp × ${data.assumedSunHoursPerDay}h sun`} />
        <Tile label="Capacity" value={`${data.installedCapacityKwp} kWp`} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Anomalies                                                         */
/* ---------------------------------------------------------------- */

function AnomaliesTab({ client }: { client: SunhouseClient }) {
  const range = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 29);
    return { from: fmtDate(from), to: fmtDate(to) };
  }, []);
  const { data, error, loading } = useAsync<StringAnomalyReportDto>(() => client.stringAnomalies(range.from, range.to), [range.from, range.to]);

  if (loading || error || !data) return <StateNotice loading={loading} error={error} empty={!data} />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Tile label="Window mean ratio" value={`${(data.windowMean * 100).toFixed(1)}%`} hint="PV1 / (PV1+PV2)" />
        <Tile label="Threshold" value={`±${data.thresholdPercent}%`} />
        <Tile label="Days used" value={`${data.windowDaysUsed}`} />
      </div>

      {data.anomalies.length === 0 ? (
        <Section title="Anomalies in the last 30 days">
          <p className="text-sm text-emerald-300/80">No deviations beyond {data.thresholdPercent}% — both strings look balanced.</p>
        </Section>
      ) : (
        <Section title={`${data.anomalies.length} anomalous day${data.anomalies.length === 1 ? "" : "s"}`}>
          <table className="w-full text-xs">
            <thead className="text-slate-500 text-left">
              <tr><th className="pb-2">Date</th><th>Day ratio</th><th>Mean</th><th>Drift</th><th>PV1 kWh</th><th>PV2 kWh</th></tr>
            </thead>
            <tbody>
              {data.anomalies.map((a) => {
                const dev = a.deviationPercent ?? 0;
                return (
                  <tr key={a.date} className="border-t border-white/5">
                    <td className="py-1.5 text-slate-300">{a.date}</td>
                    <td className="tabular-nums">{((a.pv1Pv2RatioAvg ?? 0) * 100).toFixed(1)}%</td>
                    <td className="tabular-nums text-slate-500">{((a.ratioRollingMean ?? 0) * 100).toFixed(1)}%</td>
                    <td className={`tabular-nums ${dev > 0 ? "text-amber-300" : "text-red-300"}`}>
                      {dev > 0 ? "+" : ""}{dev.toFixed(1)}%
                    </td>
                    <td className="tabular-nums text-slate-400">{(a.pv1KwhOfDay ?? 0).toFixed(1)}</td>
                    <td className="tabular-nums text-slate-400">{(a.pv2KwhOfDay ?? 0).toFixed(1)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Records                                                          */
/* ---------------------------------------------------------------- */

function RecordsTab({ client }: { client: SunhouseClient }) {
  const { data, error, loading } = useAsync<RecordsDto>(() => client.records(), []);
  if (loading || error || !data) return <StateNotice loading={loading} error={error} empty={!data} />;

  return (
    <div className="space-y-4">
      <div className="text-xs text-slate-500">
        Tracking {data.totalDays} day{data.totalDays === 1 ? "" : "s"}{data.since ? ` since ${data.since}` : ""}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(data.records ?? []).map((r) => (
          <div key={r.label} className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] tracking-wide text-slate-500">{r.label}</div>
              {r.date && <div className="text-xs text-slate-400 mt-0.5">{r.date}</div>}
            </div>
            <div className="font-display text-lg tabular-nums">
              {(r.value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}{r.unit ? ` ${r.unit}` : ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Required to satisfy Cell import if removed by tree-shake later — keeps Recharts happy.
void Cell;
