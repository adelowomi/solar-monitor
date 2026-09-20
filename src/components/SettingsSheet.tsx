import { X } from "lucide-react";
import type { UserSettings } from "../api/types";

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdate: (patch: Partial<UserSettings>) => void;
}

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

export function SettingsSheet({ open, onClose, settings, onUpdate }: SettingsSheetProps) {
  if (!open) return null;

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
            <h3 className="text-xs uppercase tracking-widest text-slate-500 mb-3 font-medium">
              Notifications
            </h3>
            <Toggle
              label="Grid restored"
              checked={settings.alertGridRestored}
              onChange={(v) => onUpdate({ alertGridRestored: v })}
            />
            <Toggle
              label="Grid lost"
              checked={settings.alertGridLost}
              onChange={(v) => onUpdate({ alertGridLost: v })}
            />
            <Toggle
              label="Low battery"
              checked={settings.alertLowBattery}
              onChange={(v) => onUpdate({ alertLowBattery: v })}
            />
            <Toggle
              label="High temperature"
              checked={settings.alertHighTemp}
              onChange={(v) => onUpdate({ alertHighTemp: v })}
            />
            <Toggle
              label="Fault detected"
              checked={settings.alertFault}
              onChange={(v) => onUpdate({ alertFault: v })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
