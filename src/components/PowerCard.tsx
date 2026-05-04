import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "./ui/Card";
import { splitUnit } from "../lib/format";

interface PowerCardProps {
  icon: LucideIcon;
  label: string;
  colorClass: string;
  value: string;
  pill?: ReactNode;
  subtitle: string;
  bar?: { value: number; colorClass: string };
}

export function PowerCard({
  icon: Icon,
  label,
  colorClass,
  value,
  pill,
  subtitle,
  bar,
}: PowerCardProps) {
  const [num, unit] = splitUnit(value);

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className={`flex items-center gap-2 ${colorClass}`}>
          <Icon className="w-4 h-4" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        {pill}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-light tabular-nums font-display">{num}</span>
        <span className="text-slate-500 text-sm">{unit}</span>
      </div>
      {bar && (
        <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${bar.colorClass}`}
            style={{ width: `${Math.min(Math.max(bar.value, 0), 100)}%` }}
          />
        </div>
      )}
      <p className="text-xs text-slate-500 mt-2">{subtitle}</p>
    </Card>
  );
}
