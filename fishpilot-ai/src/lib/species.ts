import type { SpeciesDefinition } from "@/types/fishing";

// Database base delle specie più comuni nei mari italiani (Tirreno/Mediterraneo)
// rilevanti per le tecniche di pesca ricreativa da natante supportate dall'app.
// Ogni voce definisce: range di temperatura ottimale, stagioni tipiche,
// tecniche compatibili e habitat (usato per il bonus alba/tramonto).
//
// Questo è un punto di partenza volutamente semplice: aggiungere nuove specie
// o affinare i range è pensato per essere fatto qui, senza toccare l'algoritmo.
export const SPECIES_DATABASE: SpeciesDefinition[] = [
  {
    name: "Lampuga",
    scientificName: "Coryphaena hippurus",
    minTempC: 22,
    maxTempC: 28,
    seasons: ["estate", "autunno"],
    techniques: ["traina", "drifting"],
    habitat: "pelagic",
  },
  {
    name: "Alletterato",
    scientificName: "Euthynnus alletteratus",
    minTempC: 20,
    maxTempC: 27,
    seasons: ["estate", "autunno"],
    techniques: ["traina"],
    habitat: "pelagic",
  },
  {
    name: "Palamita",
    scientificName: "Sarda sarda",
    minTempC: 16,
    maxTempC: 24,
    seasons: ["primavera", "estate", "autunno"],
    techniques: ["traina", "jigging"],
    habitat: "pelagic",
  },
  {
    name: "Ricciola",
    scientificName: "Seriola dumerili",
    minTempC: 16,
    maxTempC: 26,
    seasons: ["primavera", "estate", "autunno", "inverno"],
    techniques: ["traina", "jigging", "drifting"],
    habitat: "demersal",
  },
  {
    name: "Tonnetto (Tombarello)",
    scientificName: "Auxis rochei",
    minTempC: 21,
    maxTempC: 28,
    seasons: ["estate", "autunno"],
    techniques: ["traina"],
    habitat: "pelagic",
  },
  {
    name: "Sgombro",
    scientificName: "Scomber scombrus",
    minTempC: 12,
    maxTempC: 20,
    seasons: ["inverno", "primavera"],
    techniques: ["traina", "bolentino"],
    habitat: "pelagic",
  },
  {
    name: "Leccia",
    scientificName: "Lichia amia",
    minTempC: 16,
    maxTempC: 25,
    seasons: ["primavera", "estate", "autunno"],
    techniques: ["spinning", "traina"],
    habitat: "coastal",
  },
  {
    name: "Dentice",
    scientificName: "Dentex dentex",
    minTempC: 15,
    maxTempC: 24,
    seasons: ["primavera", "autunno", "inverno"],
    techniques: ["jigging", "bolentino", "drifting"],
    habitat: "demersal",
  },
  {
    name: "Pagello",
    scientificName: "Pagellus erythrinus",
    minTempC: 14,
    maxTempC: 24,
    seasons: ["primavera", "estate", "autunno", "inverno"],
    techniques: ["bolentino"],
    habitat: "demersal",
  },
  {
    name: "Spigola (Branzino)",
    scientificName: "Dicentrarchus labrax",
    minTempC: 12,
    maxTempC: 22,
    seasons: ["autunno", "inverno", "primavera"],
    techniques: ["spinning", "bolentino"],
    habitat: "coastal",
  },
];
