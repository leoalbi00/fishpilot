// ============================================================
// /lib/gpxExport.ts — Ecosistema ⛵ Traversata: esportazione GPX
//
// Genera un file GPX 1.1 standard (waypoint + traccia) caricabile su
// plotter di bordo (Garmin, Raymarine, Lowrance) e app di navigazione.
// La traccia usa il percorso via mare stimato (searoute-js) quando
// disponibile, altrimenti la linea diretta tra i waypoint — stesso dato già
// disegnato su RouteMap.
// ============================================================

import type { RoutePlanResult } from "@/types/fishing";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function trackCoordinates(plan: RoutePlanResult): [number, number][] {
  if (plan.legs.length === 0) {
    return plan.waypoints.map((w) => [w.longitude, w.latitude]);
  }
  const coords: [number, number][] = [];
  plan.legs.forEach((leg, i) => {
    const from = plan.waypoints[i];
    const to = plan.waypoints[i + 1];
    const legCoords: [number, number][] =
      leg.pathCoordinates && leg.pathCoordinates.length >= 2
        ? leg.pathCoordinates
        : [
            [from.longitude, from.latitude],
            [to.longitude, to.latitude],
          ];
    if (coords.length > 0) coords.pop();
    coords.push(...legCoords);
  });
  return coords;
}

/** Costruisce il contenuto testuale di un file .gpx per la rotta calcolata. */
export function buildGpx(plan: RoutePlanResult): string {
  const first = plan.waypoints[0];
  const last = plan.waypoints[plan.waypoints.length - 1];
  const routeName = `${first?.name ?? "Partenza"} - ${last?.name ?? "Arrivo"}`;

  const wpts = plan.waypoints
    .map(
      (w) =>
        `  <wpt lat="${w.latitude}" lon="${w.longitude}"><name>${escapeXml(w.name)}</name></wpt>`
    )
    .join("\n");

  const trkpts = trackCoordinates(plan)
    .map(([lon, lat]) => `      <trkpt lat="${lat}" lon="${lon}"></trkpt>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="FishPilot AI" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(routeName)}</name>
    <desc>Rotta stimata da FishPilot AI — verifica sempre su carta nautica ufficiale prima di navigare.</desc>
  </metadata>
${wpts}
  <trk>
    <name>${escapeXml(routeName)}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>
`;
}

/** Avvia il download del file .gpx nel browser (solo lato client). */
export function downloadGpx(plan: RoutePlanResult) {
  const xml = buildGpx(plan);
  const blob = new Blob([xml], { type: "application/gpx+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const first = plan.waypoints[0]?.name ?? "rotta";
  const last = plan.waypoints[plan.waypoints.length - 1]?.name ?? "";
  a.href = url;
  a.download = `fishpilot-${first}-${last}.gpx`.replace(/\s+/g, "_");
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
