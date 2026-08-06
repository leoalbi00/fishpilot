"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppPreferences } from "@/components/AppPreferencesProvider";
import type { AppMode } from "@/types/fishing";

const ECOSYSTEM_MODES: { value: AppMode; icon: string; label: string }[] = [
  { value: "traversata", icon: "⛵", label: "Traversata" },
  { value: "rada", icon: "⚓", label: "Rada" },
  { value: "pesca", icon: "🎣", label: "Pesca" },
];

const ROUTE_TABS: { href: string; icon: string; label: string }[] = [
  { href: "/chartplotter", icon: "🎛️", label: "Chartplotter" },
  { href: "/logbook", icon: "📊", label: "Copernicus & Log" },
];

const tabClasses = (active: boolean) =>
  `flex items-center gap-1.5 rounded-full px-2.5 sm:px-3.5 py-2 text-xs sm:text-sm font-body font-medium whitespace-nowrap transition-all active:scale-[0.97] min-h-[40px] ${
    active
      ? "bg-signal text-abyss shadow-[0_0_12px_rgba(255,178,56,0.35)]"
      : "text-foam/60 hover:text-foam hover:bg-hull/20"
  }`;

/** Selettore dei 5 ecosistemi applicativi. I primi 3 (⛵/⚓/🎣) cambiano il
 * contenuto della home restando sulla stessa pagina; gli ultimi 2
 * (🎛️/📊) sono schermate dedicate a sé stanti, quindi navigano su una
 * route propria — l'evidenziazione del tab attivo segue il pathname
 * invece dello stato "mode". */
export default function ModeSwitcher() {
  const { mode, setMode } = useAppPreferences();
  const pathname = usePathname();

  return (
    <div
      role="tablist"
      aria-label="Ecosistema applicativo"
      className="flex items-center gap-1 rounded-full border border-hull/50 bg-abyss/60 p-1 shrink-0"
    >
      {ECOSYSTEM_MODES.map((m) => (
        <button
          key={m.value}
          type="button"
          role="tab"
          aria-selected={pathname === "/" && mode === m.value}
          onClick={() => setMode(m.value)}
          className={tabClasses(pathname === "/" && mode === m.value)}
        >
          <span aria-hidden>{m.icon}</span>
          <span>{m.label}</span>
        </button>
      ))}
      {ROUTE_TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          role="tab"
          aria-selected={pathname.startsWith(t.href)}
          className={tabClasses(pathname.startsWith(t.href))}
        >
          <span aria-hidden>{t.icon}</span>
          <span>{t.label}</span>
        </Link>
      ))}
    </div>
  );
}
