import { useCallback, useEffect, useState } from "react";
import { X, Volume2, Smartphone, Trash2 } from "lucide-react";
import { ALERT_EVENT_TYPES, type AlarmTone, type AlertEventType, type UserSettings } from "../api/types";
import type { Alarm } from "../lib/alarm";

/** Shape of GET /api/events/push/devices rows (not part of the generated
 * OpenAPI client — this endpoint predates a gen-api refresh). */
interface PushDeviceDto {
  id: number;
  deviceId: string;
  label: string | null;
  userAgent: string | null;
  lastSeenAt: string;
  enabled: boolean;
  endpoint: string;
}

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdate: (patch: Partial<UserSettings>) => void;
  /**
   * The single Alarm instance owned by Dashboard. Reusing it (rather than
   * creating a private one here) means "Test alarm" plays through the same
   * AudioContext the header's Arm button unlocked — a separate instance
   * would have its own, never-unlocked, permanently suspended context and
   * would silently produce no sound.
   */
  alarm: Alarm;
  /** Whether `alarm`'s AudioContext is actually unlocked right now. */
  armed: boolean;
  apiBase: string;
  apiKey: string;
}

const TONES: AlarmTone[] = ["siren", "chime", "pulse", "alert"];

const EVENT_LABELS: Record<AlertEventType, string> = {
  grid_lost: "Grid lost",
  grid_restored: "Grid restored",
  low_battery: "Low battery",
  inverter_hot: "Inverter hot",
  fault_detected: "Fault detected",
  long_outage: "Long outage",
};

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between py-2">
      <span className="text-sm text-slate-300">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition ${
          checked ? "bg-amber-500" : "bg-white/10"
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? "translate-x-4" : ""
          }`}
        />
      </button>
    </label>
  );
}

export function SettingsSheet({ open, onClose, settings, onUpdate, alarm, armed, apiBase, apiKey }: SettingsSheetProps) {
  const [devices, setDevices] = useState<PushDeviceDto[] | null>(null);
  const [devicesError, setDevicesError] = useState<string | null>(null);

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

  useEffect(() => {
    if (open) void loadDevices();
  }, [open, loadDevices]);

  const revokeDevice = useCallback(
    async (endpoint: string) => {
      // Optimistic: the device disappears immediately, then we confirm with
      // the server. A failed revoke just gets picked back up on next open.
      setDevices((prev) => prev?.filter((d) => d.endpoint !== endpoint) ?? prev);
      try {
        await fetch(`${apiBase}/api/events/push/subscribe?endpoint=${encodeURIComponent(endpoint)}`, {
          method: "DELETE",
          headers: { "X-Api-Key": apiKey },
        });
      } catch {
        /* best effort — device list will self-correct on next open */
      }
    },
    [apiBase, apiKey]
  );

  if (!open) return null;

  const updateEventSetting = (type: AlertEventType, patch: Partial<{ sound: boolean; tone: AlarmTone }>) => {
    onUpdate({
      alarmEvents: {
        ...settings.alarmEvents,
        [type]: { ...settings.alarmEvents[type], ...patch },
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-900 border-t border-white/10 rounded-t-3xl p-6 pb-10 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-display font-light text-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-xs uppercase tracking-widest text-slate-500 mb-3 font-medium">
              System
            </h3>
            <label className="block mb-3">
              <span className="text-sm text-slate-300 block mb-1">
                Battery capacity (kWh)
              </span>
              <input
                type="number"
                min={1}
                max={100}
                step={0.5}
                value={settings.batteryCapacityKwh}
                onChange={(e) =>
                  onUpdate({ batteryCapacityKwh: parseFloat(e.target.value) || 5 })
                }
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-400/50 transition tabular-nums"
              />
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs uppercase tracking-widest text-slate-500 font-medium">
                Alarm
              </h3>
              <button
                type="button"
                disabled={!armed}
                onClick={() =>
                  alarm.play("siren", settings.alarmDurationSeconds * 1000, settings.alarmVolume)
                }
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
                  armed
                    ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                    : "bg-white/5 border-white/10 text-slate-600 opacity-50 cursor-not-allowed"
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                Test alarm
              </button>
            </div>
            <p className="text-xs text-amber-200/70 mb-3 min-h-[1rem]">
              {!armed && "Arm the alarm from the header first — testing is disabled until then."}
            </p>

            <label className="block mb-3">
              <span className="text-sm text-slate-300 block mb-1">
                Volume ({Math.round(settings.alarmVolume * 100)}%)
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.alarmVolume}
                onChange={(e) => onUpdate({ alarmVolume: parseFloat(e.target.value) })}
                className="w-full accent-amber-500"
              />
            </label>

            <label className="block mb-4">
              <span className="text-sm text-slate-300 block mb-1">
                Siren duration ({settings.alarmDurationSeconds}s)
              </span>
              <input
                type="range"
                min={5}
                max={60}
                step={1}
                value={settings.alarmDurationSeconds}
                onChange={(e) => onUpdate({ alarmDurationSeconds: parseInt(e.target.value, 10) || 5 })}
                className="w-full accent-amber-500"
              />
            </label>

            <div className="space-y-1">
              {ALERT_EVENT_TYPES.map((type) => {
                const eventSetting = settings.alarmEvents[type];
                return (
                  <div key={type} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-300 flex-1">{EVENT_LABELS[type]}</span>
                    <select
                      value={eventSetting.tone}
                      disabled={!eventSetting.sound}
                      onChange={(e) => updateEventSetting(type, { tone: e.target.value as AlarmTone })}
                      className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-amber-400/50 transition disabled:opacity-40"
                    >
                      {TONES.map((tone) => (
                        <option key={tone} value={tone}>
                          {tone}
                        </option>
                      ))}
                    </select>
                    <Toggle
                      label=""
                      checked={eventSetting.sound}
                      onChange={(v) => updateEventSetting(type, { sound: v })}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-widest text-slate-500 mb-3 font-medium">
              Push devices
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Devices registered to receive a push notification when no tab is
              armed to sound the siren directly.
            </p>
            {devicesError && (
              <p className="text-xs text-red-300 mb-2">{devicesError}</p>
            )}
            {devices === null && !devicesError && (
              <p className="text-xs text-slate-500">Loading…</p>
            )}
            {devices?.length === 0 && (
              <p className="text-xs text-slate-500">No devices registered yet.</p>
            )}
            {devices && devices.length > 0 && (
              <ul className="space-y-2">
                {devices.map((d) => (
                  <li
                    key={d.endpoint}
                    className="flex items-center justify-between gap-3 rounded-xl bg-white/5 border border-white/10 px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Smartphone className="w-4 h-4 text-slate-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-slate-200 truncate">
                          {d.label || d.userAgent || "Unknown device"}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Last seen {new Date(d.lastSeenAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void revokeDevice(d.endpoint)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-300 hover:bg-red-500/10 transition shrink-0"
                      title="Revoke push access"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
