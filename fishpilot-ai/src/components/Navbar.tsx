import Link from "next/link";

export default function Navbar() {
  return (
    <header className="flex items-center justify-between px-6 py-5 border-b border-hull/30">
      <Link href="/" className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-signal shadow-[0_0_10px_2px_rgba(255,178,56,0.6)]" />
        <span className="font-display text-lg tracking-tight text-foam">
          FishPilot <span className="text-tide">AI</span>
        </span>
      </Link>
      <span className="hidden sm:inline text-xs font-mono text-foam/40 uppercase tracking-widest">
        MVP gratuito
      </span>
    </header>
  );
}
