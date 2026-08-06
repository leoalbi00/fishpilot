import Navbar from "@/components/Navbar";
import HomeContent from "@/components/HomeContent";

export default function HomePage() {
  return (
    <div className="chart-texture min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 flex flex-col items-center px-6 py-10 sm:py-16">
        <HomeContent />
      </main>

      <footer className="text-center text-xs text-foam/40 font-mono py-6">
        Dati meteo-marini: Open-Meteo Marine/Forecast · Porti: OpenStreetMap · Mappe: OpenFreeMap
      </footer>
    </div>
  );
}
