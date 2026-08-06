// Turf v6 pubblica i tipi in dist/js/index.d.ts ma il campo "exports" del
// package.json non lo mappa in modo compatibile con moduleResolution
// "bundler": TypeScript vede solo il JS e lo tipizza "any". Dichiarazioni
// minime qui, limitate alle sole funzioni usate in lib/seaRouting.ts.
declare module "@turf/helpers" {
  import type { Feature, LineString, Point, Position } from "geojson";

  export function point(coordinates: Position): Feature<Point>;
  export function lineString(coordinates: Position[]): Feature<LineString>;
}

declare module "@turf/rhumb-distance" {
  import type { Feature, Point } from "geojson";

  export default function rhumbDistance(
    from: Feature<Point>,
    to: Feature<Point>,
    options?: { units?: string }
  ): number;
}

declare module "@turf/length" {
  import type { Feature, Geometry } from "geojson";

  export default function length(
    feature: Feature<Geometry>,
    options?: { units?: string }
  ): number;
}
