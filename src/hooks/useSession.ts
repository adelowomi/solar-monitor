import { useState, useCallback, useEffect, useRef } from "react";
import type { Session } from "../api/types";
import { login as apiLogin } from "../api/auth";

const STORAGE_KEY = "sunhouse_session";

const AUTO_ACCOUNT = import.meta.env.VITE_ACCOUNT as string | undefined;
const AUTO_PASSWORD = import.meta.env.VITE_PASSWORD as string | undefined;

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    if (new Date(session.expiresAt) <= new Date()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function saveSession(s: Session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(loadSession);
  const autoLoginAttempted = useRef(false);

  const signIn = useCallback(async (account: string, password: string) => {
    const s = await apiLogin(account, password);
    saveSession(s);
    setSession(s);
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

  // Auto-login when credentials are baked in and there's no valid session
  useEffect(() => {
    if (session || autoLoginAttempted.current) return;
    if (!AUTO_ACCOUNT || !AUTO_PASSWORD) return;

    autoLoginAttempted.current = true;
    apiLogin(AUTO_ACCOUNT, AUTO_PASSWORD)
      .then((s) => {
        saveSession(s);
        setSession(s);
      })
      .catch((err) => {
        console.warn("Auto-login failed:", err);
      });
  }, [session]);

  return { session, signIn, signOut };
}
