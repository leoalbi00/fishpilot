import Navbar from "@/components/Navbar";
import TripForm from "@/components/TripForm";

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
            Inserisci partenza, destinazione, tecnica e orario: FishPilot AI
            incrocia meteo, mare e stagione e ti dice dove conviene calare la
            lenza.
          </p>
        </div>

        <TripForm />
      </main>

      <footer className="text-center text-xs text-foam/40 font-mono py-6">
        Dati meteo-marini: Open-Meteo · Mappe: OpenStreetMap / OpenFreeMap
      </footer>
    </div>
  );
}
