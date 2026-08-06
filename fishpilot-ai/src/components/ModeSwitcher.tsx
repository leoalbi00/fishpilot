"use client";

import { useAppPreferences } from "@/components/AppPreferencesProvider";
import type { AppMode } from "@/types/fishing";

const MODES: { value: AppMode; icon: string; label: string }[] = [
  { value: "rada", icon: "⚓", label: "Rada" },
  { value: "pesca", icon: "🎣", label: "Pesca" },
  { value: "combo", icon: "📊", label: "Combo" },
];

/** Selettore rapido di modalità applicativa: Rada / Pesca / Combo. */
export default function ModeSwitcher() {
  const { mode, setMode } = useAppPreferences();

  return (
    <div
      role="radiogroup"
      aria-label="Modalità applicativa"
      className="flex items-center gap-1 rounded-full border border-hull/50 bg-abyss/60 p-1"
    >
      {MODES.map((m) => (
        <button
          key={m.value}
          type="button"
          role="radio"
          aria-checked={mode === m.value}
          onClick={() => setMode(m.value)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-body transition-colors min-h-[40px] ${
            mode === m.value
              ? "bg-signal text-abyss font-medium"
              : "text-foam/60 hover:text-foam"
          }`}
        >
          <span aria-hidden>{m.icon}</span>
          <span className="hidden sm:inline">{m.label}</span>
        </button>
      ))}
    </div>
  );
}
