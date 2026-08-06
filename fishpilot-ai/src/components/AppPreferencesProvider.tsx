"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { AppMode, ThemeMode } from "@/types/fishing";

const MODE_KEY = "fishpilot_mode";
const THEME_KEY = "fishpilot_theme";

interface PreferencesContextValue {
  mode: AppMode;
  setMode: (m: AppMode) => void;
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

/** Preferenze applicative globali: ecosistema (Traversata/Rada/Pesca) e
 * tema (Giorno/Sole Alto/Notte), persistite in localStorage e condivise tra
 * Navbar e Dashboard senza ricaricare la pagina. */
export function AppPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<AppMode>("pesca");
  const [theme, setThemeState] = useState<ThemeMode>("light");

  useEffect(() => {
    const storedMode = window.localStorage.getItem(MODE_KEY);
    if (storedMode === "traversata" || storedMode === "rada" || storedMode === "pesca") {
      setModeState(storedMode);
    }
    const storedTheme = window.localStorage.getItem(THEME_KEY);
    if (
      storedTheme === "day" ||
      storedTheme === "sunhigh" ||
      storedTheme === "night" ||
      storedTheme === "light"
    ) {
      setThemeState(storedTheme);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);

    const themeColor =
      theme === "sunhigh"
        ? "#000000"
        : theme === "night"
          ? "#0a0202"
          : theme === "light"
            ? "#f7fafc"
            : "#061620";
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((meta) => meta.setAttribute("content", themeColor));
  }, [theme]);

  function setMode(m: AppMode) {
    setModeState(m);
    window.localStorage.setItem(MODE_KEY, m);
  }

  function setTheme(t: ThemeMode) {
    setThemeState(t);
    window.localStorage.setItem(THEME_KEY, t);
  }

  return (
    <PreferencesContext.Provider value={{ mode, setMode, theme, setTheme }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function useAppPreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error("useAppPreferences deve essere usato dentro AppPreferencesProvider.");
  }
  return ctx;
}
