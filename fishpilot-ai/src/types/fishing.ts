// Tipi condivisi tra /lib/fishingAlgorithm.ts, /lib/species.ts e /lib/tripAnalysis.ts.
// Tenerli in un file separato evita dipendenze circolari tra i moduli.

export type Season = "inverno" | "primavera" | "estate" | "autunno";

export type FishingTechnique =
  | "traina"
  | "bolentino"
  | "spinning"
  | "jigging"
  | "drifting";

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

/** Punto campionato lungo la rotta, con relativo Fishing Score (per la mappa). */
export interface ZonePoint {
  label: string;
  latitude: number;
  longitude: number;
  score: number;
  seaSurfaceTempC: number;
  waveHeightM: number;
  windSpeedKmh: number;
}
