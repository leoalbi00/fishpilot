"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { colorForScore } from "@/lib/utils";
import type { ZonePoint } from "@/types/fishing";

interface FishingMapProps {
  /** Punti campionati lungo la rotta, in ordine: partenza -> metà -> destinazione. */
  zones: ZonePoint[];
}

export default function FishingMap({ zones }: FishingMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || zones.length === 0) return;

    const centerLng =
      zones.reduce((sum, z) => sum + z.longitude, 0) / zones.length;
    const centerLat =
      zones.reduce((sum, z) => sum + z.latitude, 0) / zones.length;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/dark",
      center: [centerLng, centerLat],
      zoom: 8,
    });

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      // Linea di rotta tra i punti campionati (percorso in linea retta:
      // non usiamo un'API di routing marino a pagamento nell'MVP).
      map.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: zones.map((z) => [z.longitude, z.latitude]),
          },
        },
      });

      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        paint: {
          "line-color": "#2dd4bf",
          "line-width": 3,
          "line-dasharray": [2, 2],
          "line-opacity": 0.85,
        },
      });

      // Un marker colorato per ogni zona, in base al Fishing Score locale.
      zones.forEach((zone) => {
        const color = colorForScore(zone.score);

        const el = document.createElement("div");
        el.style.width = "22px";
        el.style.height = "22px";
        el.style.borderRadius = "50%";
        el.style.background = color;
        el.style.border = "2px solid rgba(234,246,246,0.9)";
        el.style.boxShadow = `0 0 12px ${color}`;
        el.style.cursor = "pointer";

        const popupHtml = `
          <div style="font-family: 'Work Sans', sans-serif; min-width: 160px;">
            <strong style="display:block; margin-bottom:4px;">${zone.label}</strong>
            <span style="font-family: monospace; font-size: 13px;">Fishing Score: ${zone.score}/100</span><br/>
            <span style="font-family: monospace; font-size: 12px; opacity:0.75;">
              ${zone.seaSurfaceTempC.toFixed(1)}°C · onde ${zone.waveHeightM.toFixed(1)}m · vento ${Math.round(zone.windSpeedKmh)} km/h
            </span>
          </div>
        `;

        new maplibregl.Marker({ element: el })
          .setLngLat([zone.longitude, zone.latitude])
          .setPopup(new maplibregl.Popup({ offset: 16 }).setHTML(popupHtml))
          .addTo(map);
      });

      // Adatta lo zoom per includere tutti i punti della rotta.
      const bounds = zones.reduce(
        (b, z) => b.extend([z.longitude, z.latitude]),
        new maplibregl.LngLatBounds(
          [zones[0].longitude, zones[0].latitude],
          [zones[0].longitude, zones[0].latitude]
        )
      );
      map.fitBounds(bounds, { padding: 60, maxZoom: 11, duration: 0 });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [zones]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[420px] rounded-xl overflow-hidden border border-hull/40"
    />
  );
}
