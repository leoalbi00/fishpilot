"use client";

import { useAppPreferences } from "@/components/AppPreferencesProvider";
import type { ThemeMode } from "@/types/fishing";

const THEME_ORDER: ThemeMode[] = ["day", "sunhigh", "night"];

const THEME_META: Record<ThemeMode, { icon: string; label: string }> = {
  day: { icon: "☀️", label: "Giorno" },
  sunhigh: { icon: "🔆", label: "Sole Alto" },
  night: { icon: "🌙", label: "Notte" },
};

/** Cicla tra i temi visivi: Giorno -> Sole Alto (alto contrasto) -> Notte (visione notturna). */
export default function ThemeToggle() {
  const { theme, setTheme } = useAppPreferences();
  const meta = THEME_META[theme];

  function handleClick() {
    const idx = THEME_ORDER.indexOf(theme);
    setTheme(THEME_ORDER[(idx + 1) % THEME_ORDER.length]);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Tema: ${meta.label}. Tocca per cambiare.`}
      title={`Tema: ${meta.label}`}
      className="flex items-center gap-1.5 rounded-full border border-hull/50 bg-abyss/60 px-3 py-2 text-sm font-body text-foam/70 hover:text-foam transition-colors min-h-[40px]"
    >
      <span aria-hidden>{meta.icon}</span>
      <span className="hidden sm:inline">{meta.label}</span>
    </button>
  );
}
