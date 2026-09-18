"use client";

/**
 * React provider/hook for the visual theme. Pure tokens/types live in
 * tokens.ts - this file only wires them into context + localStorage
 * persistence.
 */
import { createContext, useContext, useEffect, useState } from "react";
import { isTheme, THEME_STORAGE_KEY, type Theme } from "@/lib/styles/tokens";

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

const ThemeContext = createContext<Theme>("graf");

export const ThemeProvider = ThemeContext.Provider;

/** Read by any component whose rendering depends on the active visual style
 * (GaugeNode, GaugeIndicator, FloatingEdge, ScenarioGraph's layout sizing). */
export function useCurrentTheme(): Theme {
  return useContext(ThemeContext);
}

/** SSR-safe: returns "graf" on the server (no localStorage), the stored
 * choice on the client. Every component whose rendering depends on theme
 * (GaugeNode, ScenarioGraph, ...) sits behind an async data fetch that
 * hasn't resolved yet at hydration time, so this can't produce a
 * server/client markup mismatch even when it differs from the SSR default. */
function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "graf";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isTheme(stored) ? stored : "graf";
}

/** Persists the chosen theme to localStorage and applies it as
 * document.documentElement's [data-theme] attribute, which every CSS custom
 * property in globals.css is scoped under. Owned by ScenarioApp, which feeds
 * the value into <ThemeProvider> for the rest of the tree to read. */
export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  return [theme, setTheme];
}
