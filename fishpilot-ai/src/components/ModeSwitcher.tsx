"use client";

import { useAppPreferences } from "@/components/AppPreferencesProvider";
import type { AppMode } from "@/types/fishing";

const MODES: { value: AppMode; icon: string; label: string }[] = [
  { value: "traversata", icon: "⛵", label: "Traversata" },
  { value: "rada", icon: "⚓", label: "Rada" },
  { value: "pesca", icon: "🎣", label: "Pesca" },
];

/** Selettore dei 3 macro-ecosistemi: ⛵ Traversata / ⚓ Rada / 🎣 Pesca. */
export default function ModeSwitcher() {
  const { mode, setMode } = useAppPreferences();

  return (
    <div
      role="radiogroup"
      aria-label="Ecosistema applicativo"
      className="flex items-center gap-1 rounded-full border border-hull/50 bg-abyss/60 p-1 shrink-0"
    >
      {MODES.map((m) => (
        <button
          key={m.value}
          type="button"
          role="radio"
          aria-checked={mode === m.value}
          onClick={() => setMode(m.value)}
          className={`flex items-center gap-1.5 rounded-full px-2.5 sm:px-3.5 py-2 text-xs sm:text-sm font-body font-medium whitespace-nowrap transition-all active:scale-[0.97] min-h-[40px] ${
            mode === m.value
              ? "bg-signal text-abyss shadow-[0_0_12px_rgba(255,178,56,0.35)]"
              : "text-foam/60 hover:text-foam hover:bg-hull/20"
          }`}
        >
          <span aria-hidden>{m.icon}</span>
          <span>{m.label}</span>
        </button>
      ))}
    </div>
  );
}
