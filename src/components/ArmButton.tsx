import { ShieldCheck, ShieldAlert, Shield, Volume2 } from "lucide-react";

interface ArmButtonProps {
  armed: boolean;
  intent: boolean;
  connected: boolean;
  onArm: () => void;
  onTest: () => void;
}

export function ArmButton({ armed, intent, connected, onArm, onTest }: ArmButtonProps) {
  if (armed) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-sm font-medium text-emerald-300">
          <ShieldCheck className="h-4 w-4" />
          Alarm armed
          {!connected && <span className="text-amber-300">· reconnecting</span>}
        </span>
        <button
          onClick={onTest}
          className="rounded-full p-1.5 text-slate-400 hover:text-slate-200"
          title="Test alarm"
        >
          <Volume2 className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // Armed previously on this device but the AudioContext is suspended after a
  // reload. Must read as a warning, never as "fine".
  if (intent) {
    return (
      <button
        onClick={onArm}
        className="inline-flex animate-pulse items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1.5 text-sm font-semibold text-amber-200 ring-1 ring-amber-400/40"
      >
        <ShieldAlert className="h-4 w-4" />
        Alarm off — click to re-arm
      </button>
    );
  }

  return (
    <button
      onClick={onArm}
      className="inline-flex items-center gap-1.5 rounded-full bg-slate-700/60 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
    >
      <Shield className="h-4 w-4" />
      Enable alarm
    </button>
  );
}
