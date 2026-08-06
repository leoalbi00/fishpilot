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
export type ThemeMode = "day" | "sunhigh" | "night" | "light";

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

/** Suggerimento di autocompletamento località (ricerca Nominatim). */
export interface LocationSuggestion {
  id: string;
  label: string;
  displayName: string;
  latitude: number;
  longitude: number;
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
  /** Codice meteo WMO (0-99, Open-Meteo) e copertura nuvolosa: assenti sui
   * report persistiti prima dell'introduzione di questi campi. Vedi
   * lib/weatherIcons.ts per l'icona/etichetta del codice. */
  weatherCode?: number;
  cloudCoverPct?: number;
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
  /** Percorso via mare [lng,lat] stimato (searoute-js), se disponibile: vedi
   * lib/searoute.ts. Assente = fallback alla linea diretta from→to. */
  pathCoordinates?: [number, number][];
  /** true se `pathCoordinates` è una rotta marittima stimata (non la linea
   * diretta): usato per mostrare il disclaimer "non per navigazione". */
  isSeaRouted?: boolean;
}

/** Condizioni sintetiche di uno scenario meteo di rotta (vedi RouteWeatherScenarios). */
export interface RouteWeatherScenario {
  windSpeedKn: number;
  windGustsKn: number;
  waveHeightM: number;
}

/** Tre scenari meteo estratti dalle previsioni live sui waypoint della
 * rotta (vedi lib/routePlanning.ts, computeWeatherScenarios): il caso
 * peggiore e migliore incontrati lungo i leg, e la media prevista per
 * l'intero viaggio. */
export interface RouteWeatherScenarios {
  worst: RouteWeatherScenario;
  best: RouteWeatherScenario;
  average: RouteWeatherScenario;
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
  weatherScenarios: RouteWeatherScenarios;
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

/** Valutazione di idoneità di una finestra oraria/giornata per la traversata. */
export type PassageRating = "buona" | "discreta" | "sconsigliata";

export interface PassageWindow {
  label: string;
  startHour: number;
  endHour: number;
  avgWindKn: number;
  avgWaveM: number;
  rating: PassageRating;
}

export interface PassageDay {
  dateISO: string;
  bestWindow: PassageWindow;
  rating: PassageRating;
}

/** Calendario dei prossimi 7 giorni (Calendario Traversata), calcolato sul
 * punto di partenza della rotta: vedi lib/passageCalendar.ts. */
export interface PassageCalendarResult {
  days: PassageDay[];
}

/** Piano di rotta completo, così come mostrato a schermo: usato sia dalla
 * pagina persistita (/traversata/[id], letta da Supabase) sia dal fallback
 * locale (/traversata/local, quando il salvataggio su Supabase non è
 * andato a buon fine) — vedi RouteResultsView. */
export interface RoutePlanResult extends RoutePlan {
  refugePorts: RefugePort[];
  /** false se la rotta non è stata salvata su Supabase (nessun link condivisibile). */
  persisted: boolean;
  /** Assente se il calcolo non è riuscito (rete/dati non disponibili): il
   * chiamante deve gestire il caso undefined, mai bloccare la pagina. */
  passageCalendar?: PassageCalendarResult;
  /** Istante (ISO, UTC) in cui questo piano è stato calcolato/ricalcolato:
   * mostrato nel box "Fonti Dati Ufficiali" come "ultimo aggiornamento". */
  generatedAtISO: string;
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
  /** true se nella finestra di 24h è previsto vento/mare da allerta (soglie
   * di severità già usate per il colore dei punti in NightForecastCard). */
  stormWarning: boolean;
  stormReasons: string[];
}

// ============================================================
// ⚓ Auto-discovery Baie & Spiagge (Rada)
// ============================================================

/** Baia/cala/spiaggia trovata automaticamente via Overpass (OSM) nel
 * raggio dello spot, con Shelter Score già calcolato: vedi lib/bayDiscovery.ts. */
export interface DiscoveredBay {
  name: string;
  type: "baia" | "spiaggia";
  latitude: number;
  longitude: number;
  distanceM: number;
  shelterScorePct: number;
  shelterLabel: string;
  /** false se la geometria OSM non permetteva di stimare l'imbocco: il
   * punteggio si basa solo sull'intensità di vento/mare (vedi lib/anchorage.ts). */
  exposureKnown: boolean;
}

// ============================================================
// ⚓/🎣 Rapporto spot (Rada e Pesca condividono la stessa analisi)
// ============================================================

export interface SpotTripInfo {
  startLocation: string;
  technique: FishingTechnique;
  date: string; // ISO
  latitude: number;
  longitude: number;
}

/** Rapporto completo per uno spot, così come mostrato a schermo: usato sia
 * dalla pagina persistita (/dashboard/[id], letta da Supabase) sia dal
 * fallback locale (/dashboard/local, quando il salvataggio su Supabase non
 * è andato a buon fine) — vedi SpotResultsView. */
export interface SpotReportResult {
  /** Presente solo se il rapporto è persistito (serve per il link alla mappa). */
  id?: string;
  /** false se il rapporto non è stato salvato su Supabase (nessun link condivisibile/mappa). */
  persisted: boolean;
  score: number;
  species: SpeciesResult[];
  recommendations: RecommendationsResult;
  conditions: ConditionsSummary;
  primaryZone?: ZonePoint;
  trip: SpotTripInfo;
  solunar: SolunarResult;
  tide: TideResult;
  nightForecast: NightForecastResult;
  /** Baie/spiagge trovate automaticamente nel raggio dello spot (Rada): vedi
   * lib/bayDiscovery.ts. Sempre calcolato (anche in modalità Pesca) per
   * permettere il cambio modalità sulla stessa pagina senza ricalcolo. */
  nearbyBays: DiscoveredBay[];
  utcOffsetSeconds: number;
  /** Istante (ISO, UTC) in cui questo rapporto è stato calcolato/ricalcolato:
   * mostrato nel box "Fonti Dati Ufficiali" come "ultimo aggiornamento". */
  generatedAtISO: string;
}
