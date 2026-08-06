import Link from "next/link";
import ModeSwitcher from "@/components/ModeSwitcher";
import ThemeToggle from "@/components/ThemeToggle";

export default function Navbar() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-hull/30">
      <Link href="/" className="flex items-center gap-2 shrink-0">
        <span className="w-2.5 h-2.5 rounded-full bg-signal shadow-[0_0_10px_2px_rgba(255,178,56,0.6)]" />
        <span className="font-display text-lg tracking-tight text-foam">
          FishPilot <span className="text-tide">AI</span>
        </span>
      </Link>

      <div className="flex items-center gap-2 order-3 sm:order-2 w-full sm:w-auto justify-center">
        <ModeSwitcher />
      </div>

      <div className="order-2 sm:order-3">
        <ThemeToggle />
      </div>
    </header>
  );
}
