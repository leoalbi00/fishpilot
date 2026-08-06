// Tipi condivisi tra /lib/fishingAlgorithm.ts, /lib/species.ts e /lib/tripAnalysis.ts.
// Tenerli in un file separato evita dipendenze circolari tra i moduli.

export type Season = "inverno" | "primavera" | "estate" | "autunno";

export type FishingTechnique =
  | "traina"
  | "bolentino"
  | "spinning"
  | "jigging"
  | "drifting";

/** Modalità di ricerca nel form: uno spot singolo (default) oppure una tratta
 * partenza -> destinazione (modalità avanzata, facoltativa). */
export type SearchMode = "spot" | "tratta";

/** Condizioni meteo generali (aria, nuvolosità, pressione, onde). */
export interface WeatherInput {
  waveHeightM: number;
  wavePeriodS: number;
  cloudCoverPct: number;
  pressureHpa: number;
  airTempC: number;
}

/** Temperatura superficiale del mare. */
export interface SeaTemperatureInput {
  surfaceTempC: number;
}

/** Vento: velocità e direzione. */
export interface WindInput {
  speedKmh: number;
  directionDeg: number;
}

/** Informazioni sull'orario della battuta di pesca. */
export interface TimeInput {
  hour: number;
  minute: number;
  isDawn: boolean;
  isDusk: boolean;
}

/** Input richiesto dall'algoritmo di scoring. */
export interface FishingAlgorithmInput {
  weather: WeatherInput;
  seaTemperature: SeaTemperatureInput;
  wind: WindInput;
  season: Season;
  time: TimeInput;
  technique: FishingTechnique;
}

export interface SpeciesResult {
  name: string;
  scientificName: string;
  probability: number; // 0-100
}

export interface RecommendationsResult {
  trollingSpeedKn?: string;
  depthM: string;
  /** Tipo di fondale stimato per la zona (roccia, sabbia, misto, grotta...). */
  seabedType: string;
  /** Montatura consigliata per la tecnica scelta. */
  rig: string;
  lures: string[];
  bestTimeWindow: string;
  notes: string[];
}

export interface ConditionsSummary {
  seaState: string;
  windState: string;
  summary: string;
  warnings: string[];
}

/** Output restituito da runFishingAlgorithm(). */
export interface FishingAlgorithmResult {
  score: number;
  species: SpeciesResult[];
  recommendations: RecommendationsResult;
  conditions: ConditionsSummary;
}

/** Voce del "database" specie in /lib/species.ts. */
export interface SpeciesDefinition {
  name: string;
  scientificName: string;
  minTempC: number;
  maxTempC: number;
  seasons: Season[];
  techniques: FishingTechnique[];
  habitat: "pelagic" | "demersal" | "coastal";
}

/** Un punto geografico geocodificato (partenza o destinazione). */
export interface GeocodedPlace {
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

/** Punto campionato lungo la rotta (o lo spot singolo), con relativo Fishing
 * Score e il dettaglio meteo-marino usato dalla Dashboard e dalla Mappa. */
export interface ZonePoint {
  label: string;
  latitude: number;
  longitude: number;
  score: number;
  seaSurfaceTempC: number;
  airTempC: number;
  pressureHpa: number;
  waveHeightM: number;
  wavePeriodS: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  /** Corrente marina: non sempre disponibile per ogni zona (dato Open-Meteo). */
  currentSpeedKmh?: number;
  currentDirectionDeg?: number;
}

/** Spot salvato tra i preferiti dall'utente (persistito su Supabase e/o localStorage). */
export interface FavoriteSpot {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  technique: FishingTechnique;
  createdAt: string;
}
