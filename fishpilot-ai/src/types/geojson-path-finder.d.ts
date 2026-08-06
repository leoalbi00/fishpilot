declare module "geojson-path-finder" {
  import type { Feature, FeatureCollection, LineString, Point } from "geojson";

  export interface PathFinderOptions {
    precision?: number;
    weightFn?: (a: [number, number], b: [number, number], props: unknown) => number;
  }

  export interface FoundPath {
    path: [number, number][];
    weight: number;
  }

  export default class PathFinder {
    constructor(graph: FeatureCollection<LineString>, options?: PathFinderOptions);
    findPath(start: Feature<Point>, finish: Feature<Point>): FoundPath | null;
  }
}
