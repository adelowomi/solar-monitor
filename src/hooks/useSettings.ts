import { useState, useCallback } from "react";
import { DEFAULT_SETTINGS, type UserSettings } from "../api/types";

const STORAGE_KEY = "sunhouse_settings";

function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useSettings() {
  const [settings, setSettingsState] = useState<UserSettings>(loadSettings);

  const updateSettings = useCallback((patch: Partial<UserSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { settings, updateSettings };
}
