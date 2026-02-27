"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase/client";

export type ThemeMode = "light" | "dark";

interface ThemeContextValue {
  theme: ThemeMode;
  loadingTheme: boolean;
  savingTheme: boolean;
  setTheme: (nextTheme: ThemeMode, options?: { persist?: boolean }) => Promise<boolean>;
  toggleTheme: () => Promise<boolean>;
}

const THEME_STORAGE_KEY = "venyou_theme_mode";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function normalizeTheme(value: unknown): ThemeMode {
  return value === "dark" ? "dark" : "light";
}

function applyThemeToDocument(theme: ThemeMode) {
  if (typeof document === "undefined") return;
  const isDark = theme === "dark";
  document.documentElement.setAttribute("data-theme", theme);
  document.body.setAttribute("data-theme", theme);
  document.documentElement.classList.toggle("dark-theme", isDark);
  document.body.classList.toggle("dark-theme", isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "light";
    return normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  });
  const [savingTheme, setSavingTheme] = useState(false);
  const loadingTheme = authLoading;

  useEffect(() => {
    applyThemeToDocument(theme);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }, [theme]);

  useEffect(() => {
    if (authLoading || !user) return;

    let active = true;

    void (async () => {
      const { data, error } = await supabase
        .from("user_preferences")
        .select("theme")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!active) return;

      if (!error && data?.theme) {
        setThemeState(normalizeTheme(data.theme));
      } else if (!error && !data) {
        // New accounts start from a clean per-user default.
        setThemeState("light");
      }
    })();

    return () => {
      active = false;
    };
  }, [authLoading, user]);

  const setTheme = useCallback(
    async (nextTheme: ThemeMode, options?: { persist?: boolean }) => {
      const normalized = normalizeTheme(nextTheme);
      const shouldPersist = options?.persist !== false;
      setThemeState(normalized);

      if (!shouldPersist || !user) return true;

      setSavingTheme(true);
      const { error } = await supabase.from("user_preferences").upsert(
        {
          user_id: user.id,
          theme: normalized,
        },
        {
          onConflict: "user_id",
        }
      );
      setSavingTheme(false);

      return !error;
    },
    [user]
  );

  const toggleTheme = useCallback(
    async () => setTheme(theme === "dark" ? "light" : "dark"),
    [setTheme, theme]
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      loadingTheme,
      savingTheme,
      setTheme,
      toggleTheme,
    }),
    [loadingTheme, savingTheme, setTheme, theme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
