"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { readActiveRoute } from "@/lib/activeRoute";
import type { RoutePlanResult } from "@/types/fishing";

interface ChartplotterMapProps {
  position: GeolocationPosition | null;
}

/** Mappa own-ship del Chartplotter: posizione e prua live (GPS), più la
 * rotta attiva se presente (vedi lib/activeRoute.ts). Il layer AIS è
 * dichiarato ma non renderizza traffico reale: nessun provider AIS
 * gratuito/senza chiave è configurato in questa build (vedi nota sotto il
 * toggle) — mostrare imbarcazioni finte sarebbe più pericoloso che non
 * mostrarne nessuna. */
export default function ChartplotterMap({ position }: ChartplotterMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const shipMarkerRef = useRef<maplibregl.Marker | null>(null);
  const shipElRef = useRef<HTMLDivElement | null>(null);
  const centeredRef = useRef(false);
  const [showAis, setShowAis] = useState(false);
  const [plan] = useState<RoutePlanResult | null>(() => readActiveRoute());

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const startCenter: [number, number] = plan
      ? [plan.waypoints[0].longitude, plan.waypoints[0].latitude]
      : [14, 40];

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/dark",
      center: startCenter,
      zoom: 10,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    const el = document.createElement("div");
    el.style.width = "0";
    el.style.height = "0";
    el.style.borderLeft = "9px solid transparent";
    el.style.borderRight = "9px solid transparent";
    el.style.borderBottom = "20px solid #ffb238";
    el.style.filter = "drop-shadow(0 0 6px rgba(255,178,56,0.7))";
    el.style.transformOrigin = "50% 65%";
    shipElRef.current = el;

    map.on("load", () => {
      if (!plan) return;
      map.addSource("chartplotter-route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: plan.waypoints.map((w) => [w.longitude, w.latitude]),
          },
        },
      });
      map.addLayer({
        id: "chartplotter-route-line",
        type: "line",
        source: "chartplotter-route",
        paint: { "line-color": "#2dd4bf", "line-width": 3, "line-dasharray": [2, 2], "line-opacity": 0.85 },
      });

      const bounds = plan.waypoints.reduce(
        (b, w) => b.extend([w.longitude, w.latitude]),
        new maplibregl.LngLatBounds(
          [plan.waypoints[0].longitude, plan.waypoints[0].latitude],
          [plan.waypoints[0].longitude, plan.waypoints[0].latitude]
        )
      );
      map.fitBounds(bounds, { padding: 60, maxZoom: 12, duration: 0 });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      shipMarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Aggiorna posizione/prua own-ship e centra la mappa al primo fix GPS.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !position) return;

    const lngLat: [number, number] = [position.coords.longitude, position.coords.latitude];
    const heading =
      typeof position.coords.heading === "number" && !Number.isNaN(position.coords.heading)
        ? position.coords.heading
        : 0;

    if (shipElRef.current) {
      shipElRef.current.style.transform = `rotate(${heading}deg)`;
    }

    if (!shipMarkerRef.current && shipElRef.current) {
      shipMarkerRef.current = new maplibregl.Marker({ element: shipElRef.current })
        .setLngLat(lngLat)
        .addTo(map);
    } else {
      shipMarkerRef.current?.setLngLat(lngLat);
    }

    if (!centeredRef.current && !plan) {
      map.flyTo({ center: lngLat, zoom: 13, duration: 0 });
      centeredRef.current = true;
    }
  }, [position, plan]);

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-1.5 text-xs font-body text-foam/60 cursor-pointer w-fit">
        <input
          type="checkbox"
          checked={showAis}
          onChange={(e) => setShowAis(e.target.checked)}
          className="accent-tide"
        />
        Layer AIS
      </label>
      {showAis && (
        <p className="text-xs text-signal/90 bg-signal/10 border border-signal/30 rounded-lg px-3 py-2">
          Nessuna sorgente AIS configurata in questa build: richiede una chiave a un provider AIS
          (es. AISHub, MarineTraffic) o un ricevitore SDR locale. Il layer resta vuoto invece di
          mostrare traffico non reale.
        </p>
      )}
      <div
        ref={containerRef}
        className="w-full h-[420px] rounded-xl overflow-hidden border border-hull/40"
      />
    </div>
  );
}
