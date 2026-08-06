interface Technique {
  name: string;
  icon: string;
  description: string;
  tips: string[];
}

const TECHNIQUES: Technique[] = [
  {
    name: "Light Drifting",
    icon: "🎣",
    description:
      "Esca naturale (alaccia, sardina) lasciata scendere e lavorare in deriva sottobordo, canna leggera e piombo minimo.",
    tips: [
      "Innesco naturale, lascia agire la corrente",
      "Freno morbido: l'abboccata è spesso delicata",
      "Ideale su ricciole e leccia in prossimità di secche",
    ],
  },
  {
    name: "Eging Notturno",
    icon: "🦑",
    description:
      "Totanare (egi) lavorate sotto la luce di poppa: il fascio luminoso attira plancton e calamari a caccia.",
    tips: [
      "Luce di poppa accesa, egi color naturale/UV in prossimità del cono di luce",
      "Jerk decisi + pause lunghe per simulare un gamberetto ferito",
      "Migliore nelle notti senza luna piena (meno luce ambiente = più contrasto)",
    ],
  },
  {
    name: "Bolentino da Fermo",
    icon: "🪢",
    description:
      "Lenza verticale con 2-3 ami a paternoster ed esca naturale, calata sul fondo sottobordo a barca ancorata.",
    tips: [
      "Piombo adeguato alla corrente per restare verticali",
      "Bigattini/gamberetto/calamaro a seconda della specie target",
      "Tocchi leggeri: ferrata rapida ma non violenta",
    ],
  },
  {
    name: "PAF (Pesca a Fondo leggera)",
    icon: "🐟",
    description:
      "Variante leggera del bolentino: canna da spinning, piombo/jig head minimo ed esche morbide lavorate verticalmente sul fondo.",
    tips: [
      "Perfetta per saraghi, occhiate e donzelle sottobarca",
      "Recupero lento a piccoli scatti, contatto costante col fondo",
      "Braid sottile per sentire anche le abboccate più delicate",
    ],
  },
];

/** Tecniche da svolgere con barca all'ancora ("da fermo in rada"). */
export default function AtAnchorTechniquesCard() {
  return (
    <div className="rounded-xl border border-hull/40 bg-depth/60 p-5 space-y-4">
      <h3 className="font-display text-foam text-lg">Da Fermo in Rada</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TECHNIQUES.map((t) => (
          <div key={t.name} className="rounded-lg border border-hull/40 bg-abyss/50 p-4 space-y-2">
            <p className="font-display text-foam flex items-center gap-2">
              <span aria-hidden>{t.icon}</span> {t.name}
            </p>
            <p className="text-sm text-foam/70">{t.description}</p>
            <ul className="text-xs text-foam/50 list-disc list-inside space-y-0.5">
              {t.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
