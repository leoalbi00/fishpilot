// Tipi condivisi tra /lib/fishingAlgorithm.ts, /lib/species.ts e /lib/tripAnalysis.ts.
// Tenerli in un file separato evita dipendenze circolari tra i moduli.

export type Season = "inverno" | "primavera" | "estate" | "autunno";

export type FishingTechnique =
  | "traina"
  | "bolentino"
  | "spinning"
  | "jigging"
  | "drifting";

/** Ecosistema applicativo: tre ambiti indipendenti dell'app. */
export type AppMode = "traversata" | "rada" | "pesca";

/** Tema visivo: Giorno (default), Sole Alto (altissimo contrasto), Notte
 * (toni rossi per preservare la visione notturna). */
export type ThemeMode = "day" | "sunhigh" | "night";

/** Tipo di fondale registrato dall'utente per un preferito (per la tenuta ancora). */
export type SeabedHoldingType =
  | "sabbia"
  | "posidonia"
  | "roccia"
  | "fango"
  | "misto"
  | "sconosciuto";

/** Periodo solunare: "major" (culminazione/anti-culminazione lunare, ~2h,
 * picco di attività) o "minor" (sorgere/tramonto lunare, ~1h). */
export interface SolunarPeriod {
  kind: "major" | "minor";
  startISO: string;
  endISO: string;
  label: string;
}

export interface SolunarResult {
  moonPhaseLabel: string;
  moonIllumination: number; // 0-1
  periods: SolunarPeriod[];
}

/** Punto del grafico marea (approssimazione astronomica, vedi lib/tides.ts). */
export interface TidePoint {
  timeISO: string;
  heightM: number;
}

export interface TidePeak {
  timeISO: string;
  heightM: number;
  type: "alta" | "bassa";
}

export interface TideResult {
  points: TidePoint[];
  peaks: TidePeak[];
}

/** Valutazione della protezione della baia per l'ancoraggio (euristica). */
export interface ShelterAssessment {
  scorePct: number; // 0-100
  label: string;
  warnings: string[];
  exposureKnown: boolean;
}

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
  /** Offset UTC (secondi) dello spot, per convertire in ora locale gli
   * orari calcolati da lib/astro.ts, lib/solunar.ts e lib/tides.ts. */
  utcOffsetSeconds?: number;
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
  waveDirectionDeg: number;
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
  /** Tipo di fondale registrato manualmente dall'utente (per la tenuta ancora). */
  seabedType: SeabedHoldingType;
  createdAt: string;
}

// ============================================================
// ⛵ Ecosistema Traversata (Passage Planning)
// ============================================================

export interface RouteWaypoint {
  name: string;
  latitude: number;
  longitude: number;
}

/** Settore del vento relativo alla prua (0°=di prua, 180°=di poppa). */
export type RelativeWindSector = "prua" | "mure" | "traverso" | "poppa-quartiere" | "poppa";

export interface RouteLeg {
  from: string;
  to: string;
  distanceNm: number;
  bearingDeg: number;
  etaISO: string;
  windSpeedKn: number;
  windGustsKn: number;
  windDirectionDeg: number;
  relativeWindAngleDeg: number; // 0-180
  relativeWindSector: RelativeWindSector;
  waveHeightM: number;
  wavePeriodS: number;
  waveDirectionDeg: number;
  currentSpeedKmh?: number;
  currentDirectionDeg?: number;
  seaSurfaceTempC: number;
  warnings: string[];
}

export interface RoutePlan {
  waypoints: RouteWaypoint[];
  legs: RouteLeg[];
  totalDistanceNm: number;
  totalDurationHours: number;
  cruiseSpeedKn: number;
  fuelLPerHour?: number;
  fuelLitersEstimate?: number;
  departureISO: string;
  etaFinalISO: string;
  utcOffsetSeconds: number;
}

/** Porto/marina di rifugio nei pressi della rotta (fonte: OpenStreetMap). */
export interface RefugePort {
  name: string;
  latitude: number;
  longitude: number;
  distanceNm: number;
  /** Avviso derivato dalle previsioni lungo la rotta (non un bollettino ufficiale). */
  warning?: string;
}

/** Piano di rotta completo, così come mostrato a schermo: usato sia dalla
 * pagina persistita (/traversata/[id], letta da Supabase) sia dal fallback
 * locale (/traversata/local, quando il salvataggio su Supabase non è
 * andato a buon fine) — vedi RouteResultsView. */
export interface RoutePlanResult extends RoutePlan {
  refugePorts: RefugePort[];
  /** false se la rotta non è stata salvata su Supabase (nessun link condivisibile). */
  persisted: boolean;
}

// ============================================================
// ⚓ Previsione Notturna (Rada)
// ============================================================

export interface NightForecastPoint {
  timeISO: string;
  windSpeedKmh: number;
  windGustsKmh: number;
  windDirectionDeg: number;
  waveHeightM: number;
}

export interface NightForecastResult {
  points: NightForecastPoint[];
  trend: "migliora" | "peggiora" | "stabile";
  maxWindSpeedKmh: number;
  maxWaveHeightM: number;
}
