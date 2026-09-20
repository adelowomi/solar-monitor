import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Sun,
  BatteryCharging,
  BatteryFull,
  BatteryLow,
  Plug,
  PlugZap,
  Bell,
  BellOff,
  RefreshCw,
  Settings,
  BarChart3,
  Sparkles,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { CurrentReadingDto, SunhouseClient } from "../api/sunhouse";
import type { AlertEvent } from "../api/events";
import type { UserSettings } from "../api/types";
import { usePolling } from "../hooks/usePolling";
import { useNotifications } from "../hooks/useNotifications";
import { useAlertStream, deviceId } from "../hooks/useAlertStream";
import { createAlarm } from "../lib/alarm";
import { registerPush } from "../lib/push";
import { deriveStateFromReading, deriveSummary } from "../lib/derive";
import { fmtKw, fmtKwh } from "../lib/format";
import { StatusPill } from "./ui/StatusPill";
import { HeroStatus } from "./HeroStatus";
import { EnergyFlowDiagram } from "./EnergyFlowDiagram";
import { PowerCard } from "./PowerCard";
import { HouseLoadCard } from "./HouseLoadCard";
import { SecondaryStats } from "./SecondaryStats";
import { SettingsSheet, type PushDeviceDto } from "./SettingsSheet";
import { InsightsPanel } from "./InsightsPanel";
import { ConfigPanel } from "./ConfigPanel";
import { ArmButton } from "./ArmButton";
import { AlarmBanner } from "./AlarmBanner";

const POLL_INTERVAL = 30_000;

interface DashboardProps {
  client: SunhouseClient;
  apiBase: string;
  apiKey: string;
  settings: UserSettings;
  onUpdateSettings: (patch: Partial<UserSettings>) => void;
}

export function Dashboard({ client, apiBase, apiKey, settings, onUpdateSettings }: DashboardProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const { permission, enabled, toggle, requestPermission, notify } = useNotifications();

  const alarm = useMemo(() => createAlarm(), []);
  const [armed, setArmed] = useState(() => alarm.isArmed());
  useEffect(() => alarm.onStateChange(setArmed), [alarm]);
  const [pushUnavailable, setPushUnavailable] = useState(false);

  // pushUnavailable is otherwise only set inside handleArm, so after a reload a
  // device whose push subscription has since been revoked shows no warning
  // until the user re-arms. Check on mount too, whenever arming intent persists,
  // so the degradation stays visible instead of silently disappearing.
  useEffect(() => {
    if (!settings.alarmArmIntent) return;
    if (!("serviceWorker" in navigator)) return;
    let cancelled = false;
    void (async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        if (!cancelled) setPushUnavailable(!sub);
      } catch {
        if (!cancelled) setPushUnavailable(true);
      }
    })();
    return () => { cancelled = true; };
  }, [settings.alarmArmIntent]);

  const [devices, setDevices] = useState<PushDeviceDto[] | null>(null);
  const [devicesError, setDevicesError] = useState<string | null>(null);

  // Fetched from the settings-gear click itself, not from an effect reacting
  // to `settingsOpen` — this is a plain user-initiated action, not an effect
  // synchronizing with an external system, so it stays outside useEffect.
  const loadDevices = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/events/push/devices`, {
        headers: { "X-Api-Key": apiKey },
      });
      if (!res.ok) throw new Error(`devices ${res.status}`);
      setDevices(await res.json());
      setDevicesError(null);
    } catch {
      setDevicesError("Couldn't load push devices");
    }
  }, [apiBase, apiKey]);

  const handleOpenSettings = useCallback(() => {
    setSettingsOpen(true);
    void loadDevices();
  }, [loadDevices]);

  const handleRevokeDevice = useCallback(
    (endpoint: string) => {
      // Optimistic: the device disappears immediately, then we confirm with
      // the server. A failed revoke just gets picked back up on next open.
      setDevices((prev) => prev?.filter((d) => d.endpoint !== endpoint) ?? prev);
      void fetch(`${apiBase}/api/events/push/subscribe?endpoint=${encodeURIComponent(endpoint)}`, {
        method: "DELETE",
        headers: { "X-Api-Key": apiKey },
      }).catch(() => { /* best effort — device list will self-correct on next open */ });
    },
    [apiBase, apiKey]
  );

  const onAlertEvent = useCallback(
    (e: AlertEvent) => notify(e.title, { body: e.body }),
    [notify]
  );

  const { connected, activeAlert, dismiss } = useAlertStream({
    apiBase,
    apiKey,
    settings,
    alarm,
    onEvent: onAlertEvent,
  });

  const handleArm = useCallback(async () => {
    // Single click must do the whole gesture: unlock audio, ask for
    // notification permission, register for push (reach when no tab is
    // armed), and persist intent so a reload can tell the user they're
    // silently disarmed instead of looking fine.
    await alarm.unlock();
    await requestPermission();
    onUpdateSettings({ alarmArmIntent: true });
    // Push can never be loud — the in-tab siren above is the loud path.
    // This only extends reach to devices with no armed tab; if it fails,
    // arming still succeeds and we surface the degradation instead of
    // hiding it.
    const ok = await registerPush(apiBase, apiKey, deviceId());
    setPushUnavailable(!ok);
  }, [alarm, requestPermission, onUpdateSettings, apiBase, apiKey]);

  const handleTestAlarm = useCallback(() => {
    alarm.play("siren", settings.alarmDurationSeconds * 1000, settings.alarmVolume);
  }, [alarm, settings.alarmDurationSeconds, settings.alarmVolume]);

  const fetchCurrent = useCallback(async (): Promise<CurrentReadingDto> => client.current(), [client]);

  const { data: reading, error, lastUpdate, refetch, refreshing } = usePolling(fetchCurrent, POLL_INTERVAL);

  if (!reading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white px-6">
        <AlarmBanner event={activeAlert} onDismiss={dismiss} />
        <div className="text-center">
          <RefreshCw className="w-6 h-6 mx-auto animate-spin text-amber-300" />
          <p className="mt-3 text-sm text-slate-400 font-light">
            {error ? error : "Fetching the latest reading…"}
          </p>
          {error && (
            <button
              onClick={refetch}
              className="mt-4 text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  const s = deriveStateFromReading(reading, settings);
  const summary = deriveSummary(s, settings);

  const BatteryIcon = s.soc > 80 ? BatteryFull : s.soc < 20 ? BatteryLow : BatteryCharging;
  const batteryBarColor =
    s.soc > 50 ? "bg-emerald-400" : s.soc > 20 ? "bg-amber-400" : "bg-red-400";
  const batterySubtitle = s.batteryHoursLeft
    ? `~${s.batteryHoursLeft.toFixed(1)}h left at current use`
    : s.batteryCharging
      ? `Charging at ${fmtKw(s.batteryPower)}`
      : "Idle";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <AlarmBanner event={activeAlert} onDismiss={dismiss} />
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 right-1/4 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-8">
        <header className="flex items-center justify-between mb-10">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Sun className="w-4 h-4 text-slate-950" strokeWidth={2.5} />
              </div>
              <span className="font-light text-lg tracking-tight font-display">Sunhouse</span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 ml-10">
              Reading from Sunhouse API · {reading.ageSeconds}s old
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium ${
                connected
                  ? "bg-emerald-500/10 text-emerald-300"
                  : "bg-red-500/15 text-red-300"
              }`}
              title={connected ? "Live alert stream connected" : "Alert stream disconnected — reconnecting"}
            >
              {connected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            </span>
            <ArmButton
              armed={armed}
              intent={settings.alarmArmIntent}
              connected={connected}
              onArm={handleArm}
              onTest={handleTestAlarm}
              pushUnavailable={pushUnavailable}
            />
            {permission === "granted" ? (
              <button
                onClick={toggle}
                className={`p-2.5 rounded-xl border transition ${
                  enabled
                    ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-slate-200"
                }`}
                title={enabled ? "Notifications on" : "Notifications off"}
              >
                {enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              </button>
            ) : (
              <button
                onClick={requestPermission}
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200 transition"
                title="Enable notifications"
              >
                <BellOff className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={refetch}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200 transition"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setInsightsOpen(true)}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200 transition"
              title="Insights"
            >
              <Sparkles className="w-4 h-4" />
            </button>
            <button
              onClick={() => setConfigOpen(true)}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200 transition"
              title="API settings"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <button
              onClick={handleOpenSettings}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200 transition"
              title="Local settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        <HeroStatus summary={summary} workingMode={s.workingMode} lastUpdate={lastUpdate} />

        <EnergyFlowDiagram
          pvPower={s.pvPower}
          batteryPower={s.batteryPower}
          loadPower={s.loadPower}
          acInputPower={s.acInputPower}
          soc={s.soc}
          gridOn={s.gridOn}
          pvPanelFlow={s.pvPanelFlow}
          gridFlow={s.gridFlow}
          batteryFlow={s.batteryFlow}
          loadFlow={s.loadFlow}
        />

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <PowerCard
            icon={Sun}
            label="Solar"
            colorClass="text-amber-300"
            value={fmtKw(s.pvPower)}
            pill={s.pvPower > 0.05 ? <StatusPill tone="warm">producing</StatusPill> : undefined}
            subtitle={
              s.todayPvGen > 0 ? `${fmtKwh(s.todayPvGen)} generated today` : "No solar yield yet today"
            }
          />
          <PowerCard
            icon={BatteryIcon}
            label="Battery"
            colorClass="text-emerald-300"
            value={`${s.soc.toFixed(0)} %`}
            pill={
              s.batteryCharging ? (
                <StatusPill tone="good" icon={BatteryCharging}>
                  charging
                </StatusPill>
              ) : s.batteryDischarging ? (
                <StatusPill tone="warm">discharging</StatusPill>
              ) : undefined
            }
            subtitle={batterySubtitle}
            bar={{ value: s.soc, colorClass: batteryBarColor }}
          />
          <PowerCard
            icon={s.gridOn ? PlugZap : Plug}
            label="Grid"
            colorClass="text-sky-300"
            value={s.gridOn ? `${s.acInputVoltage.toFixed(0)} V` : "—"}
            pill={s.gridOn ? <StatusPill tone="good">on</StatusPill> : <StatusPill tone="bad">off</StatusPill>}
            subtitle={s.gridOn ? "Mains live" : "No mains power right now"}
          />
        </div>

        <HouseLoadCard
          loadPower={s.loadPower}
          loadPercentage={s.loadPercentage}
          todayConsumed={s.todayLoadConsumed}
          todayBattDischarge={s.todayBattDischarge}
          batteryDischarging={s.batteryDischarging}
        />

        <SecondaryStats
          heatSinkTemp={s.heatSinkTemp}
          batteryVoltage={s.batteryVoltage}
          acOutputFrequency={s.acOutputFrequency}
          faultId={s.faultId}
        />

        {error && (
          <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6">
            {error}
          </div>
        )}

        {permission !== "granted" && (
          <div className="rounded-2xl bg-amber-500/5 border border-amber-500/20 p-4 mb-6">
            <p className="text-sm text-amber-200/90">
              <Bell className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              Want to be told when the grid comes back on?{" "}
              <button onClick={requestPermission} className="underline font-medium">
                Enable notifications
              </button>
              .
            </p>
            <p className="text-xs text-amber-200/50 mt-1.5">
              You&apos;ll need to keep this tab open for them to fire.
            </p>
          </div>
        )}

        <p className="text-xs text-slate-600 text-center font-light">
          Polls every 30 seconds · API at {apiBase}
        </p>
      </div>

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdate={onUpdateSettings}
        alarm={alarm}
        armed={armed}
        devices={devices}
        devicesError={devicesError}
        onRevokeDevice={handleRevokeDevice}
      />

      <InsightsPanel open={insightsOpen} onClose={() => setInsightsOpen(false)} client={client} apiBase={apiBase} />
      <ConfigPanel open={configOpen} onClose={() => setConfigOpen(false)} client={client} />
    </div>
  );
}
