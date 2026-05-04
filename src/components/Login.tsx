import { useState } from "react";
import { Sun, Eye, EyeOff } from "lucide-react";

interface LoginProps {
  onLogin: (account: string, password: string) => Promise<void>;
}

export function Login({ onLogin }: LoginProps) {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      await onLogin(account, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/30">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-sm">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 mb-6 shadow-lg shadow-amber-500/30">
            <Sun className="w-7 h-7 text-slate-950" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-light text-white tracking-tight font-display">
            Sunhouse
          </h1>
          <p className="text-sm text-slate-400 mt-2 font-light">
            Your home, powered by the sun.
          </p>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder="Account"
            autoComplete="username"
            className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50 focus:bg-white/10 transition"
          />
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder="Password"
              autoComplete="current-password"
              className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50 focus:bg-white/10 transition pr-12"
            />
            <button
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
              type="button"
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <button
            onClick={submit}
            disabled={loading || !account || !password}
            className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-medium rounded-xl hover:shadow-lg hover:shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {loading ? "Signing in\u2026" : "Sign in"}
          </button>
        </div>

        <p className="text-xs text-slate-600 text-center mt-8 font-light">
          Connects to your Solar of Things account
        </p>
      </div>
    </div>
  );
}
