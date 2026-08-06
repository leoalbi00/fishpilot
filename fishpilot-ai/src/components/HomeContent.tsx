"use client";

import { useAppPreferences } from "@/components/AppPreferencesProvider";
import TripForm from "@/components/TripForm";
import RouteForm from "@/components/RouteForm";
import FavoritesPanel from "@/components/FavoritesPanel";

const INTRO: Record<string, { eyebrow: string; title: string; body: string }> = {
  traversata: {
    eyebrow: "Passage planning",
    title: "Pianifica la rotta prima di mollare gli ormeggi",
    body: "Punto di partenza, arrivo ed eventuali waypoint: FishPilot AI calcola distanza, ETA, consumo stimato e il meteo previsto lungo la rotta.",
  },
  rada: {
    eyebrow: "Ancoraggio & sosta",
    title: "Scegli la baia giusta per la notte",
    body: "Indica lo spot (o usa il GPS): Shelter Score, tenuta del fondale, allarme ancora e previsione notturna per una sosta sicura.",
  },
  pesca: {
    eyebrow: "Fishing Score in tempo reale",
    title: "Leggi il mare prima di salpare",
    body: "Indica il tuo spot (o usa il GPS), la tecnica e l'orario: FishPilot AI incrocia meteo, mare e stagione e ti dice cosa, dove e come pescare.",
  },
};

/** Corpo della home, dipendente dall'ecosistema attivo (⛵/⚓/🎣). */
export default function HomeContent() {
  const { mode } = useAppPreferences();
  const intro = INTRO[mode];

  return (
    <>
      <div className="max-w-2xl text-center space-y-4 mb-10">
        <p className="font-mono text-xs tracking-[0.3em] text-tide uppercase">{intro.eyebrow}</p>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold text-foam leading-tight">
          {intro.title}
        </h1>
        <p className="font-body text-foam/70 text-base sm:text-lg">{intro.body}</p>
      </div>

      {mode === "traversata" ? (
        <RouteForm />
      ) : (
        <>
          <TripForm />
          <FavoritesPanel />
        </>
      )}
    </>
  );
}
