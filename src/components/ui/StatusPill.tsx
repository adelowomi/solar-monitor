import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { SummaryTone } from "../../api/types";

const toneClasses: Record<SummaryTone, string> = {
  good: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  bad: "bg-red-500/15 text-red-300 border-red-500/30",
  neutral: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  warm: "bg-amber-500/15 text-amber-300 border-amber-500/30",
};

interface StatusPillProps {
  tone: SummaryTone;
  children: ReactNode;
  icon?: LucideIcon;
}

export function StatusPill({ tone, children, icon: Icon }: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${toneClasses[tone]}`}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  );
}
