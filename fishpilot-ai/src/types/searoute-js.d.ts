declare module "searoute-js" {
  import type { Feature, LineString, Point } from "geojson";

  export default function searoute(
    origin: Feature<Point>,
    destination: Feature<Point>,
    units?: "nm" | "miles" | "kilometers" | "degrees" | "radians"
  ): Feature<LineString> | null;
}
