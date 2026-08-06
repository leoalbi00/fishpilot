import Navbar from "@/components/Navbar";
import TripForm from "@/components/TripForm";
import FavoritesPanel from "@/components/FavoritesPanel";

export default function HomePage() {
  return (
    <div className="chart-texture min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 flex flex-col items-center px-6 py-10 sm:py-16">
        <div className="max-w-2xl text-center space-y-4 mb-10">
          <p className="font-mono text-xs tracking-[0.3em] text-tide uppercase">
            Fishing Score in tempo reale
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-foam leading-tight">
            Leggi il mare prima di salpare
          </h1>
          <p className="font-body text-foam/70 text-base sm:text-lg">
            Indica il tuo spot (o usa il GPS), la tecnica e l&apos;orario:
            FishPilot AI incrocia meteo, mare e stagione e ti dice cosa, dove
            e come pescare.
          </p>
        </div>

        <TripForm />
        <FavoritesPanel />
      </main>

      <footer className="text-center text-xs text-foam/40 font-mono py-6">
        Dati meteo-marini: Open-Meteo · Mappe: OpenStreetMap / OpenFreeMap
      </footer>
    </div>
  );
}
