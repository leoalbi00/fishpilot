import { runFishingAlgorithm } from "@/lib/fishingAlgorithm";
import { geocodeLocation } from "@/lib/geocode";
import { buildTimeInfo, getSeason, midpoint } from "@/lib/utils";
import { fetchMarineConditions, fetchWeatherConditions } from "@/lib/weather";
import type {
  FishingAlgorithmResult,
  FishingTechnique,
  GeocodedPlace,
  Season,
  TimeInput,
  ZonePoint,
} from "@/types/fishing";

export interface TripAnalysisInput {
  startLocationRaw: string;
  destinationRaw: string;
  technique: FishingTechnique;
  dateISO: string; // "YYYY-MM-DD"
  hour: number; // 0-23
  minute: number; // 0-59
}

export interface TripAnalysisResult {
  start: GeocodedPlace;
  destination: GeocodedPlace;
  season: Season;
  time: TimeInput;
  primary: FishingAlgorithmResult;
  /** Punti campionati lungo la rotta, in ordine: partenza -> metà rotta -> destinazione. */
  zones: ZonePoint[];
}

/**
 * Analizza l'intero viaggio: geocodifica partenza/destinazione, campiona le
 * condizioni meteo-marine in 3 punti lungo la rotta (partenza, metà, arrivo)
 * ed esegue l'algoritmo di scoring su ciascuno.
 *
 * Il report "primary" (score/specie/consigli mostrati in dashboard) è quello
 * calcolato sul punto medio della rotta, rappresentativo della zona di pesca.
 */
export async function analyzeTrip(
  input: TripAnalysisInput
): Promise<TripAnalysisResult> {
  const [start, destination] = await Promise.all([
    geocodeLocation(input.startLocationRaw),
    geocodeLocation(input.destinationRaw),
  ]);

  const mid = midpoint(start, destination);
  const season = getSeason(input.dateISO);

  const samplePoints = [
    { label: start.name, latitude: start.latitude, longitude: start.longitude },
    { label: "Rotta (metà percorso)", latitude: mid.latitude, longitude: mid.longitude },
    { label: destination.name, latitude: destination.latitude, longitude: destination.longitude },
  ];

  const sampled = await Promise.all(
    samplePoints.map(async (point) => {
      const [marine, weather] = await Promise.all([
        fetchMarineConditions(point.latitude, point.longitude, input.dateISO, input.hour),
        fetchWeatherConditions(point.latitude, point.longitude, input.dateISO, input.hour),
      ]);

      const time = buildTimeInfo(
        input.hour,
        input.minute,
        weather.sunrise,
        weather.sunset
      );

      const result = runFishingAlgorithm({
        weather: {
          waveHeightM: marine.waveHeightM,
          wavePeriodS: marine.wavePeriodS,
          cloudCoverPct: weather.cloudCoverPct,
          pressureHpa: weather.pressureHpa,
          airTempC: weather.airTempC,
        },
        seaTemperature: { surfaceTempC: marine.seaSurfaceTempC },
        wind: { speedKmh: weather.windSpeedKmh, directionDeg: weather.windDirectionDeg },
        season,
        time,
        technique: input.technique,
      });

      const zone: ZonePoint = {
        label: point.label,
        latitude: point.latitude,
        longitude: point.longitude,
        score: result.score,
        seaSurfaceTempC: marine.seaSurfaceTempC,
        waveHeightM: marine.waveHeightM,
        windSpeedKmh: weather.windSpeedKmh,
      };

      return { zone, result, time };
    })
  );

  // Il punto medio (indice 1) rappresenta la zona di pesca principale.
  const midSample = sampled[1];

  return {
    start,
    destination,
    season,
    time: midSample.time,
    primary: midSample.result,
    zones: sampled.map((s) => s.zone),
  };
}
