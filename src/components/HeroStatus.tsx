import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card } from "./ui/Card";
import { StatusPill } from "./ui/StatusPill";
import { fmtRelativeTime } from "../lib/format";
import type { DerivedSummary } from "../api/types";

interface HeroStatusProps {
  summary: DerivedSummary;
  workingMode: string;
  lastUpdate: Date | null;
}

export function HeroStatus({ summary, workingMode, lastUpdate }: HeroStatusProps) {
  return (
    <Card className="mb-6 relative overflow-hidden">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-2 font-medium">
            Right now
          </p>
          <h1 className="text-3xl md:text-4xl font-light leading-tight max-w-xl font-display">
            {summary.message}
          </h1>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusPill
            tone={summary.tone}
            icon={summary.tone === "bad" ? AlertTriangle : CheckCircle2}
          >
            {workingMode}
          </StatusPill>
          {lastUpdate && (
            <span className="text-xs text-slate-500">
              Updated {fmtRelativeTime(lastUpdate)}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
