import { Thermometer, Zap, Activity, AlertTriangle } from "lucide-react";
import { Card } from "./ui/Card";

interface SecondaryStatsProps {
  heatSinkTemp: number;
  batteryVoltage: number;
  acOutputFrequency: number;
  faultId: number;
}

export function SecondaryStats({
  heatSinkTemp,
  batteryVoltage,
  acOutputFrequency,
  faultId,
}: SecondaryStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card className="!p-4">
        <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-2">
          <Thermometer className="w-3 h-3" /> Inverter temp
        </div>
        <div className="text-xl font-light tabular-nums">
          {heatSinkTemp.toFixed(1)}&deg;<span className="text-slate-500 text-sm">C</span>
        </div>
      </Card>
      <Card className="!p-4">
        <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-2">
          <Zap className="w-3 h-3" /> Battery voltage
        </div>
        <div className="text-xl font-light tabular-nums">
          {batteryVoltage.toFixed(1)}
          <span className="text-slate-500 text-sm">V</span>
        </div>
      </Card>
      <Card className="!p-4">
        <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-2">
          <Activity className="w-3 h-3" /> AC out frequency
        </div>
        <div className="text-xl font-light tabular-nums">
          {acOutputFrequency.toFixed(1)}
          <span className="text-slate-500 text-sm">Hz</span>
        </div>
      </Card>
      <Card className="!p-4">
        <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-2">
          <AlertTriangle className="w-3 h-3" /> Faults
        </div>
        <div className="text-xl font-light tabular-nums">
          {faultId === 0 ? (
            <span className="text-emerald-300">None</span>
          ) : (
            <span className="text-red-300">#{faultId}</span>
          )}
        </div>
      </Card>
    </div>
  );
}
