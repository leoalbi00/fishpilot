import Link from "next/link";
import ModeSwitcher from "@/components/ModeSwitcher";
import ThemeToggle from "@/components/ThemeToggle";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-hull/40 bg-abyss/85 backdrop-blur-md">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-signal shadow-[0_0_10px_2px_rgba(255,178,56,0.6)]" />
          <span className="font-display text-lg tracking-tight text-foam">
            FishPilot <span className="text-tide">AI</span>
          </span>
        </Link>

        <div className="flex items-center gap-2 order-3 sm:order-2 w-full sm:w-auto justify-center overflow-x-auto">
          <ModeSwitcher />
        </div>

        <div className="flex items-center gap-2 order-2 sm:order-3">
          <Link
            href="/"
            aria-label="Torna alla vista principale"
            title="Home"
            className="flex items-center justify-center min-w-[40px] min-h-[40px] rounded-full border border-hull/50 bg-abyss/60 text-foam/70 hover:text-foam transition-colors"
          >
            🏠
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
