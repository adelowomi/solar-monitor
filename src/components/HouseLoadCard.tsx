import { Home } from "lucide-react";
import { Card } from "./ui/Card";
import { StatusPill } from "./ui/StatusPill";
import { fmtKw, fmtKwh, splitUnit } from "../lib/format";

interface HouseLoadCardProps {
  loadPower: number;
  loadPercentage: number;
  todayConsumed: number;
  todayBattDischarge: number;
  batteryDischarging: boolean;
}

export function HouseLoadCard({
  loadPower,
  loadPercentage,
  todayConsumed,
  todayBattDischarge,
  batteryDischarging,
}: HouseLoadCardProps) {
  const [num, unit] = splitUnit(fmtKw(loadPower));

  return (
    <Card className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-violet-300">
          <Home className="w-4 h-4" />
          <span className="text-sm font-medium">Your house is using</span>
        </div>
        <StatusPill tone="neutral">{loadPercentage}% of inverter</StatusPill>
      </div>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-5xl font-light tabular-nums font-display">{num}</span>
        <span className="text-slate-500">{unit}</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-violet-400 rounded-full transition-all duration-700"
          style={{ width: `${Math.min(loadPercentage, 100)}%` }}
        />
      </div>
      <p className="text-xs text-slate-500 mt-3">
        Used {fmtKwh(todayConsumed)} today
        {batteryDischarging && ` \u00b7 ${fmtKwh(todayBattDischarge)} pulled from battery`}
      </p>
    </Card>
  );
}
