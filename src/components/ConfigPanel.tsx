import { useEffect, useState } from "react";
import { X, RefreshCw, KeyRound, Wallet, Sun, Battery, Webhook, Save, Mail, Send } from "lucide-react";
import type {
  ConfigurationDto,
  PollerStatusDto,
  SunhouseClient,
  UpdateConfigurationRequest,
} from "../api/sunhouse";

interface ConfigPanelProps {
  open: boolean;
  onClose: () => void;
  client: SunhouseClient;
}

type TabKey = "tariffs" | "email" | "poller" | "webhook";

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "tariffs", label: "Tariffs & site", icon: Wallet },
  { key: "email", label: "Email", icon: Mail },
  { key: "poller", label: "Poller", icon: KeyRound },
  { key: "webhook", label: "Webhook", icon: Webhook },
];

export function ConfigPanel({ open, onClose, client }: ConfigPanelProps) {
  const [tab, setTab] = useState<TabKey>("tariffs");
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl bg-slate-950 border border-white/10 max-h-[92vh] overflow-y-auto">
        <header className="flex items-center justify-between p-6 border-b border-white/5 sticky top-0 bg-slate-950 z-10">
          <div>
            <h2 className="font-display text-xl tracking-tight">API settings</h2>
            <p className="text-xs text-slate-500 mt-1">Stored server-side</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <nav className="flex gap-1 px-6 py-3 border-b border-white/5 sticky top-[88px] bg-slate-950 z-10">
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
          {tab === "tariffs" && <TariffsTab client={client} />}
          {tab === "email" && <EmailTab client={client} />}
          {tab === "poller" && <PollerTab client={client} />}
          {tab === "webhook" && <WebhookTab client={client} />}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */

function useConfig(client: SunhouseClient) {
  const [config, setConfig] = useState<ConfigurationDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setConfig(await client.getConfiguration());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load config");
      } finally {
        setLoading(false);
      }
    })();
  }, [client]);

  return { config, setConfig, error, loading };
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-4 py-3 border-b border-white/5 last:border-b-0">
      <div>
        <div className="text-sm text-slate-200">{label}</div>
        {hint && <div className="text-[11px] text-slate-500 mt-0.5">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </label>
  );
}

function NumInput({
  value,
  onChange,
  unit,
}: {
  value: number;
  onChange: (v: number) => void;
  unit?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        step="0.01"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(parseFloat(e.target.value || "0"))}
        className="w-28 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-right tabular-nums focus:outline-none focus:border-amber-400/50"
      />
      {unit && <span className="text-xs text-slate-500 w-10">{unit}</span>}
    </div>
  );
}

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="time"
      value={value.slice(0, 5)}
      onChange={(e) => onChange(`${e.target.value}:00`)}
      className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-amber-400/50"
    />
  );
}

function StatusLine({ kind, text }: { kind: "ok" | "err" | null; text: string }) {
  if (!kind) return null;
  return (
    <div
      className={`text-xs mt-3 px-3 py-2 rounded-lg ${
        kind === "ok"
          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
          : "bg-red-500/10 border border-red-500/20 text-red-300"
      }`}
    >
      {text}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Tariffs / site                                                    */
/* ---------------------------------------------------------------- */

function TariffsTab({ client }: { client: SunhouseClient }) {
  const { config, setConfig, error, loading } = useConfig(client);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  if (loading) return <LoadingRow />;
  if (error) return <ErrorRow text={error} />;
  if (!config) return null;

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const patch: UpdateConfigurationRequest = {
        gridTariffNgnPerKwh: config.gridTariffNgnPerKwh,
        dieselTariffNgnPerKwh: config.dieselTariffNgnPerKwh,
        installedCapacityKwp: config.installedCapacityKwp,
        batteryNominalKwh: config.batteryNominalKwh,
        assumedSunHoursPerDay: config.assumedSunHoursPerDay,
        sundownLocal: config.sundownLocal,
        sunriseLocal: config.sunriseLocal,
        pvStringDriftPercentThreshold: config.pvStringDriftPercentThreshold,
      };
      const updated = await client.updateConfiguration(patch);
      setConfig(updated);
      setStatus({ kind: "ok", text: "Saved." });
    } catch (e) {
      setStatus({ kind: "err", text: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="rounded-3xl bg-white/[0.04] border border-white/[0.06] p-6">
        <h3 className="text-sm tracking-wide text-slate-400 mb-2 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-emerald-300" /> Tariffs
        </h3>
        <FieldRow label="Grid tariff" hint="NGN per kWh — what you'd pay the grid">
          <NumInput
            value={config.gridTariffNgnPerKwh}
            onChange={(v) => setConfig({ ...config, gridTariffNgnPerKwh: v })}
            unit="₦/kWh"
          />
        </FieldRow>
        <FieldRow label="Diesel-equivalent tariff" hint="NGN per kWh — generator alternative">
          <NumInput
            value={config.dieselTariffNgnPerKwh}
            onChange={(v) => setConfig({ ...config, dieselTariffNgnPerKwh: v })}
            unit="₦/kWh"
          />
        </FieldRow>
      </div>

      <div className="rounded-3xl bg-white/[0.04] border border-white/[0.06] p-6 mt-4">
        <h3 className="text-sm tracking-wide text-slate-400 mb-2 flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-300" /> Solar install
        </h3>
        <FieldRow label="Installed capacity" hint="Sum of all PV panel ratings">
          <NumInput
            value={config.installedCapacityKwp}
            onChange={(v) => setConfig({ ...config, installedCapacityKwp: v })}
            unit="kWp"
          />
        </FieldRow>
        <FieldRow label="Assumed sun hours" hint="Daily peak-sun-hours for your latitude">
          <NumInput
            value={config.assumedSunHoursPerDay}
            onChange={(v) => setConfig({ ...config, assumedSunHoursPerDay: v })}
            unit="h"
          />
        </FieldRow>
        <FieldRow label="PV string drift threshold" hint="Flag day if PV1/PV2 ratio deviates by more">
          <NumInput
            value={config.pvStringDriftPercentThreshold}
            onChange={(v) => setConfig({ ...config, pvStringDriftPercentThreshold: v })}
            unit="%"
          />
        </FieldRow>
      </div>

      <div className="rounded-3xl bg-white/[0.04] border border-white/[0.06] p-6 mt-4">
        <h3 className="text-sm tracking-wide text-slate-400 mb-2 flex items-center gap-2">
          <Battery className="w-4 h-4 text-emerald-300" /> Battery & night window
        </h3>
        <FieldRow label="Battery nominal capacity">
          <NumInput
            value={config.batteryNominalKwh}
            onChange={(v) => setConfig({ ...config, batteryNominalKwh: v })}
            unit="kWh"
          />
        </FieldRow>
        <FieldRow label="Sundown (local)">
          <TimeInput
            value={config.sundownLocal}
            onChange={(v) => setConfig({ ...config, sundownLocal: v })}
          />
        </FieldRow>
        <FieldRow label="Sunrise (local)">
          <TimeInput
            value={config.sunriseLocal}
            onChange={(v) => setConfig({ ...config, sunriseLocal: v })}
          />
        </FieldRow>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-medium hover:shadow-lg hover:shadow-amber-500/20 disabled:opacity-40 transition"
      >
        <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save"}
      </button>
      <StatusLine kind={status?.kind ?? null} text={status?.text ?? ""} />
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Poller                                                            */
/* ---------------------------------------------------------------- */

function PollerTab({ client }: { client: SunhouseClient }) {
  const [status, setStatus] = useState<PollerStatusDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await client.pollerStatus();
      setStatus(s);
      if (s.account) setAccount(s.account);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load poller status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const s = await client.setPollerCredentials({ account, password });
      setStatus(s);
      setPassword("");
      setMsg({ kind: "ok", text: "Credentials saved — poll triggered." });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  const trigger = async () => {
    setMsg(null);
    try {
      const s = await client.triggerPoll();
      setStatus(s);
      setMsg({ kind: "ok", text: "Poll triggered." });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Trigger failed" });
    }
  };

  if (loading) return <LoadingRow />;
  if (error) return <ErrorRow text={error} />;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white/[0.04] border border-white/[0.06] p-6">
        <h3 className="text-sm tracking-wide text-slate-400 mb-4">Status</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div className="text-slate-500">Configured</div><div>{status?.credentialsConfigured ? "Yes" : "No"}</div>
          <div className="text-slate-500">Account</div><div>{status?.account ?? "—"}</div>
          <div className="text-slate-500">Station</div><div>{status?.stationName ?? "—"}</div>
          <div className="text-slate-500">Device</div><div>{status?.deviceName ?? "—"}</div>
          <div className="text-slate-500">Installed (Siseli)</div><div>{status?.installedCapacityKwp ?? "—"} kWp</div>
          <div className="text-slate-500">Last login</div><div>{status?.lastLoginAt ?? "—"}</div>
          <div className="text-slate-500">Last poll</div><div>{status?.lastPollAt ?? "—"}</div>
          <div className="text-slate-500">Last error</div><div className="text-red-300">{status?.lastPollError ?? "—"}</div>
          <div className="text-slate-500">Interval</div><div>{status?.pollIntervalSeconds ?? "—"} s</div>
        </div>
        <button
          onClick={trigger}
          className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Trigger poll now
        </button>
      </div>

      <div className="rounded-3xl bg-white/[0.04] border border-white/[0.06] p-6">
        <h3 className="text-sm tracking-wide text-slate-400 mb-4">Siseli credentials</h3>
        <p className="text-xs text-slate-500 mb-4">
          Stored encrypted (AES-GCM) on the API. Updating clears the cached station/device IDs so they re-resolve.
        </p>
        <div className="space-y-3">
          <input
            type="text"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder="Siseli account"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-amber-400/50"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Siseli password"
            autoComplete="off"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-amber-400/50"
          />
          <button
            onClick={save}
            disabled={saving || !account || !password}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-medium hover:shadow-lg hover:shadow-amber-500/20 disabled:opacity-40 transition text-sm"
          >
            <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save"}
          </button>
          <StatusLine kind={msg?.kind ?? null} text={msg?.text ?? ""} />
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Email                                                            */
/* ---------------------------------------------------------------- */

type DayOfWeek = "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday";
const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: "sunday", label: "Sunday" },
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
];

function EmailTab({ client }: { client: SunhouseClient }) {
  const { config, setConfig, error, loading } = useConfig(client);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  if (loading) return <LoadingRow />;
  if (error) return <ErrorRow text={error} />;
  if (!config) return null;

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const patch: UpdateConfigurationRequest = {
        recipientEmail: config.recipientEmail ?? "",
        emailOnGridLost: config.emailOnGridLost,
        emailOnGridRestored: config.emailOnGridRestored,
        emailOnFault: config.emailOnFault,
        emailOnLowBattery: config.emailOnLowBattery,
        lowBatterySocThreshold: config.lowBatterySocThreshold,
        emailOnLongOutage: config.emailOnLongOutage,
        longOutageMinutesThreshold: config.longOutageMinutesThreshold,
        emailDailySummaryAtLocal: config.emailDailySummaryAtLocal ?? null,
        clearEmailDailySummary: !config.emailDailySummaryAtLocal,
        emailMidDaySummaryAtLocal: config.emailMidDaySummaryAtLocal ?? null,
        clearEmailMidDaySummary: !config.emailMidDaySummaryAtLocal,
        emailWeeklySummaryAtLocal: config.emailWeeklySummaryAtLocal ?? null,
        clearEmailWeeklySummary: !config.emailWeeklySummaryAtLocal,
        emailWeeklySummaryDay: config.emailWeeklySummaryDay,
      };
      const updated = await client.updateConfiguration(patch);
      setConfig(updated);
      setStatus({ kind: "ok", text: "Saved." });
    } catch (e) {
      setStatus({ kind: "err", text: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    setStatus(null);
    try {
      const result = await client.sendTestEmail({ to: null });
      setStatus({
        kind: result.sent ? "ok" : "err",
        text: result.sent ? `Sent test email to ${result.recipient}` : "Test email was not sent",
      });
    } catch (e) {
      setStatus({ kind: "err", text: e instanceof Error ? e.message : "Test send failed" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-white/[0.04] border border-white/[0.06] p-6">
        <h3 className="text-sm tracking-wide text-slate-400 mb-2 flex items-center gap-2">
          <Mail className="w-4 h-4 text-emerald-300" /> Recipient
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          The single inbox that receives every alert and summary email.
        </p>
        <input
          type="email"
          value={config.recipientEmail ?? ""}
          onChange={(e) => setConfig({ ...config, recipientEmail: e.target.value })}
          placeholder="you@example.com"
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-amber-400/50"
        />
        <div className="flex gap-2 mt-3">
          <button
            onClick={sendTest}
            disabled={testing || !config.recipientEmail}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 disabled:opacity-40 transition text-sm"
          >
            <Send className="w-3.5 h-3.5" /> {testing ? "Sending…" : "Send test email"}
          </button>
          {config.emailConfigured && (
            <span className="text-[11px] text-emerald-400/80 self-center">API can send</span>
          )}
        </div>
      </div>

      <div className="rounded-3xl bg-white/[0.04] border border-white/[0.06] p-6">
        <h3 className="text-sm tracking-wide text-slate-400 mb-4">Alerts</h3>
        <FieldRow label="Grid lost" hint="One email per outage when mains drops">
          <Checkbox
            label=""
            checked={config.emailOnGridLost}
            onChange={(v) => setConfig({ ...config, emailOnGridLost: v })}
          />
        </FieldRow>
        <FieldRow label="Grid restored" hint="With outage duration">
          <Checkbox
            label=""
            checked={config.emailOnGridRestored}
            onChange={(v) => setConfig({ ...config, emailOnGridRestored: v })}
          />
        </FieldRow>
        <FieldRow label="Inverter fault" hint="First-seen alert per fault transition">
          <Checkbox
            label=""
            checked={config.emailOnFault}
            onChange={(v) => setConfig({ ...config, emailOnFault: v })}
          />
        </FieldRow>
        <FieldRow label="Low battery" hint="Once per outage when SOC crosses below">
          <div className="flex items-center gap-3">
            <NumInput
              value={config.lowBatterySocThreshold}
              onChange={(v) => setConfig({ ...config, lowBatterySocThreshold: v })}
              unit="%"
            />
            <Checkbox
              label=""
              checked={config.emailOnLowBattery}
              onChange={(v) => setConfig({ ...config, emailOnLowBattery: v })}
            />
          </div>
        </FieldRow>
        <FieldRow label="Long outage" hint="Once per outage that exceeds the threshold">
          <div className="flex items-center gap-3">
            <NumInput
              value={config.longOutageMinutesThreshold}
              onChange={(v) => setConfig({ ...config, longOutageMinutesThreshold: v })}
              unit="min"
            />
            <Checkbox
              label=""
              checked={config.emailOnLongOutage}
              onChange={(v) => setConfig({ ...config, emailOnLongOutage: v })}
            />
          </div>
        </FieldRow>
      </div>

      <div className="rounded-3xl bg-white/[0.04] border border-white/[0.06] p-6">
        <h3 className="text-sm tracking-wide text-slate-400 mb-2">Scheduled summaries</h3>
        <p className="text-xs text-slate-500 mb-4">
          Clear a time to disable that summary. All times local ({config.sundownLocal} sundown).
        </p>
        <FieldRow label="Morning recap" hint="Yesterday's totals">
          <TimeOrOff
            value={config.emailDailySummaryAtLocal ?? null}
            onChange={(v) => setConfig({ ...config, emailDailySummaryAtLocal: v })}
          />
        </FieldRow>
        <FieldRow label="Midday check" hint="Today's progress so far">
          <TimeOrOff
            value={config.emailMidDaySummaryAtLocal ?? null}
            onChange={(v) => setConfig({ ...config, emailMidDaySummaryAtLocal: v })}
          />
        </FieldRow>
        <FieldRow label="Weekly recap" hint="Sent on the configured day">
          <div className="flex items-center gap-2">
            <select
              value={config.emailWeeklySummaryDay}
              onChange={(e) => setConfig({ ...config, emailWeeklySummaryDay: e.target.value as DayOfWeek })}
              className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-amber-400/50"
            >
              {DAYS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
            <TimeOrOff
              value={config.emailWeeklySummaryAtLocal ?? null}
              onChange={(v) => setConfig({ ...config, emailWeeklySummaryAtLocal: v })}
            />
          </div>
        </FieldRow>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-medium hover:shadow-lg hover:shadow-amber-500/20 disabled:opacity-40 transition"
      >
        <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save email settings"}
      </button>
      <StatusLine kind={status?.kind ?? null} text={status?.text ?? ""} />
    </div>
  );
}

function TimeOrOff({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="time"
        value={value ? value.slice(0, 5) : ""}
        onChange={(e) => onChange(e.target.value ? `${e.target.value}:00` : null)}
        className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-amber-400/50"
      />
      {value && (
        <button
          onClick={() => onChange(null)}
          className="text-[11px] px-2 py-1 rounded-lg text-slate-400 hover:text-slate-200"
          title="Disable"
        >
          off
        </button>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Webhook                                                          */
/* ---------------------------------------------------------------- */

function WebhookTab({ client }: { client: SunhouseClient }) {
  const { config, setConfig, error, loading } = useConfig(client);
  const [newSecret, setNewSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  if (loading) return <LoadingRow />;
  if (error) return <ErrorRow text={error} />;
  if (!config) return null;

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const patch: UpdateConfigurationRequest = {
        webhookUrl: config.webhookUrl ?? "",
        webhookOnGridLost: config.webhookOnGridLost,
        webhookOnGridRestored: config.webhookOnGridRestored,
        webhookOnFault: config.webhookOnFault,
        ...(newSecret ? { webhookSecret: newSecret } : {}),
      };
      const updated = await client.updateConfiguration(patch);
      setConfig(updated);
      setNewSecret("");
      setStatus({ kind: "ok", text: "Saved." });
    } catch (e) {
      setStatus({ kind: "err", text: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  const clearSecret = async () => {
    setSaving(true);
    try {
      const updated = await client.updateConfiguration({ clearWebhookSecret: true });
      setConfig(updated);
      setStatus({ kind: "ok", text: "Secret cleared." });
    } catch (e) {
      setStatus({ kind: "err", text: e instanceof Error ? e.message : "Clear failed" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-white/[0.04] border border-white/[0.06] p-6">
        <h3 className="text-sm tracking-wide text-slate-400 mb-4">Webhook target</h3>
        <p className="text-xs text-slate-500 mb-4">
          On grid transitions and faults, the API POSTs a small JSON payload to this URL with{" "}
          <code className="text-slate-400">X-Sunhouse-Event</code> and (if a secret is set) an HMAC-SHA256{" "}
          <code className="text-slate-400">X-Sunhouse-Signature</code> header.
        </p>
        <input
          type="url"
          value={config.webhookUrl ?? ""}
          onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
          placeholder="https://hooks.slack.com/..."
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-amber-400/50"
        />
        <div className="mt-4 space-y-2">
          <Checkbox
            label="Send on grid lost"
            checked={config.webhookOnGridLost}
            onChange={(v) => setConfig({ ...config, webhookOnGridLost: v })}
          />
          <Checkbox
            label="Send on grid restored"
            checked={config.webhookOnGridRestored}
            onChange={(v) => setConfig({ ...config, webhookOnGridRestored: v })}
          />
          <Checkbox
            label="Send on fault detected"
            checked={config.webhookOnFault}
            onChange={(v) => setConfig({ ...config, webhookOnFault: v })}
          />
        </div>
      </div>

      <div className="rounded-3xl bg-white/[0.04] border border-white/[0.06] p-6">
        <h3 className="text-sm tracking-wide text-slate-400 mb-4">Signing secret</h3>
        <p className="text-xs text-slate-500 mb-4">
          Currently {config.webhookSecretConfigured ? "configured." : "not set."} The secret is write-only — once
          saved, it can't be read back.
        </p>
        <input
          type="password"
          value={newSecret}
          onChange={(e) => setNewSecret(e.target.value)}
          placeholder="New secret (leave blank to keep current)"
          autoComplete="off"
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-amber-400/50"
        />
        <div className="flex gap-2 mt-3">
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-medium hover:shadow-lg hover:shadow-amber-500/20 disabled:opacity-40 transition text-sm"
          >
            <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save"}
          </button>
          {config.webhookSecretConfigured && (
            <button
              onClick={clearSecret}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition text-sm"
            >
              Clear secret
            </button>
          )}
        </div>
      </div>

      <StatusLine kind={status?.kind ?? null} text={status?.text ?? ""} />
    </div>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded accent-amber-400"
      />
      {label}
    </label>
  );
}

function LoadingRow() {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500 py-8">
      <RefreshCw className="w-4 h-4 animate-spin" /> Loading…
    </div>
  );
}

function ErrorRow({ text }: { text: string }) {
  return <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-300">{text}</div>;
}
