"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { RefugePort, RouteWaypoint } from "@/types/fishing";

interface RouteMapProps {
  waypoints: RouteWaypoint[];
  refugePorts?: RefugePort[];
}

export default function RouteMap({ waypoints, refugePorts = [] }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || waypoints.length === 0) return;

    const centerLng = waypoints.reduce((sum, w) => sum + w.longitude, 0) / waypoints.length;
    const centerLat = waypoints.reduce((sum, w) => sum + w.latitude, 0) / waypoints.length;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/dark",
      center: [centerLng, centerLat],
      zoom: 8,
    });

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      map.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: waypoints.map((w) => [w.longitude, w.latitude]),
          },
        },
      });

      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        paint: {
          "line-color": "#ffb238",
          "line-width": 3,
          "line-opacity": 0.9,
        },
      });

      waypoints.forEach((w, i) => {
        const el = document.createElement("div");
        el.style.width = "26px";
        el.style.height = "26px";
        el.style.borderRadius = "50%";
        el.style.background = "#061620";
        el.style.border = "2px solid #ffb238";
        el.style.color = "#ffb238";
        el.style.display = "flex";
        el.style.alignItems = "center";
        el.style.justifyContent = "center";
        el.style.fontFamily = "monospace";
        el.style.fontSize = "12px";
        el.style.fontWeight = "600";
        el.style.boxShadow = "0 0 10px rgba(255,178,56,0.6)";
        el.textContent = i === 0 ? "A" : i === waypoints.length - 1 ? "B" : String(i);

        new maplibregl.Marker({ element: el })
          .setLngLat([w.longitude, w.latitude])
          .setPopup(new maplibregl.Popup({ offset: 16 }).setText(w.name))
          .addTo(map);
      });

      refugePorts.forEach((port) => {
        const el = document.createElement("div");
        el.style.width = "16px";
        el.style.height = "16px";
        el.style.borderRadius = "50%";
        el.style.background = port.warning ? "#ff6b57" : "#2dd4bf";
        el.style.border = "2px solid rgba(234,246,246,0.9)";

        new maplibregl.Marker({ element: el })
          .setLngLat([port.longitude, port.latitude])
          .setPopup(
            new maplibregl.Popup({ offset: 12 }).setHTML(
              `<div style="font-family:'Work Sans',sans-serif;min-width:140px;"><strong>⚓ ${port.name}</strong><br/><span style="font-family:monospace;font-size:12px;">${port.distanceNm.toFixed(1)} NM</span></div>`
            )
          )
          .addTo(map);
      });

      const bounds = waypoints.reduce(
        (b, w) => b.extend([w.longitude, w.latitude]),
        new maplibregl.LngLatBounds(
          [waypoints[0].longitude, waypoints[0].latitude],
          [waypoints[0].longitude, waypoints[0].latitude]
        )
      );
      map.fitBounds(bounds, { padding: 60, maxZoom: 11, duration: 0 });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [waypoints, refugePorts]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[420px] rounded-xl overflow-hidden border border-hull/40"
    />
  );
}
