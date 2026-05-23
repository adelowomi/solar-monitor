import { AlertTriangle } from "lucide-react";

export function ConfigMissing() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-br from-slate-950 via-slate-900 to-red-950/20 text-white">
      <div className="max-w-md w-full">
        <div className="rounded-3xl bg-white/[0.04] border border-white/[0.08] p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-300" />
            </div>
            <h1 className="font-display text-xl">Sunhouse — config missing</h1>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            Create <code className="text-amber-300">.env.local</code> at the project root with both of
            these variables set, then restart the dev server.
          </p>
          <pre className="mt-4 text-xs bg-black/40 border border-white/5 rounded-xl p-4 overflow-x-auto text-slate-200 leading-relaxed">
{`VITE_SUNHOUSE_API_BASE=https://your-sunhouse-api.example.com
VITE_SUNHOUSE_API_KEY=your-api-key`}
          </pre>
          <p className="text-[11px] text-slate-500 mt-4">
            See <code>.env.local.example</code> for the template.
          </p>
        </div>
      </div>
    </div>
  );
}
