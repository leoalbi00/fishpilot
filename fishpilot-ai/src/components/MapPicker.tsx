"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export interface MapPickerProps {
  initialCenter?: { lat: number; lng: number };
  /** Se presente, mostra un cerchio di questo raggio (metri) attorno al punto scelto (modalità area, Pesca). */
  radiusM?: number;
  onPick: (point: { lat: number; lng: number }) => void;
}

const SEAMARK_ID = "seamark";
const BATHY_ID = "bathy";
const MPA_ID = "mpa";
const CIRCLE_SOURCE_ID = "pick-radius";

const EMPTY_FC: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

function circleGeoJSON(
  center: { lat: number; lng: number },
  radiusM: number,
  points = 64
): GeoJSON.FeatureCollection {
  const distanceX = radiusM / (111320 * Math.cos((center.lat * Math.PI) / 180));
  const distanceY = radiusM / 110540;
  const coords: [number, number][] = [];

  for (let i = 0; i <= points; i++) {
    const theta = (i / points) * 2 * Math.PI;
    coords.push([center.lng + distanceX * Math.cos(theta), center.lat + distanceY * Math.sin(theta)]);
  }

  return {
    type: "FeatureCollection",
    features: [{ type: "Feature", geometry: { type: "Polygon", coordinates: [coords] }, properties: {} }],
  };
}

/** Mappa interattiva per selezionare uno spot (click o trascinamento del
 * marker) invece della sola ricerca testuale/GPS. Layer opzionali:
 * segnalamenti nautici (OpenSeaMap, stabile), batimetria e Aree Marine
 * Protette (EMODnet WMS, "beta": servizi esterni best-effort, la mappa
 * degrada semplicemente mostrando tile vuote se non disponibili). */
export default function MapPicker({ initialCenter, radiusM, onPick }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const onPickRef = useRef(onPick);
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(initialCenter ?? null);
  const [showSeamark, setShowSeamark] = useState(true);
  const [showBathy, setShowBathy] = useState(false);
  const [showMpa, setShowMpa] = useState(false);
  // Lo stile della mappa si carica in modo asincrono: cambiare la visibilità
  // di un layer prima che sia pronto (map.on("load")) lancia un errore
  // "Style is not done loading." Gli effetti sotto restano in attesa.
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/dark",
      center: initialCenter ? [initialCenter.lng, initialCenter.lat] : [14, 40],
      zoom: initialCenter ? 11 : 5,
    });

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    function placeMarker(p: { lat: number; lng: number }) {
      if (!mapRef.current) return;
      if (markerRef.current) {
        markerRef.current.setLngLat([p.lng, p.lat]);
        return;
      }
      const el = document.createElement("div");
      el.style.width = "22px";
      el.style.height = "22px";
      el.style.borderRadius = "50%";
      el.style.background = "#ffb238";
      el.style.border = "3px solid rgba(6,22,32,0.9)";
      el.style.boxShadow = "0 0 12px rgba(255,178,56,0.7)";
      el.style.cursor = "grab";

      const marker = new maplibregl.Marker({ element: el, draggable: true })
        .setLngLat([p.lng, p.lat])
        .addTo(mapRef.current);

      marker.on("dragend", () => {
        const lngLat = marker.getLngLat();
        const np = { lat: lngLat.lat, lng: lngLat.lng };
        setPoint(np);
        onPickRef.current(np);
      });

      markerRef.current = marker;
    }

    map.on("load", () => {
      map.addSource(SEAMARK_ID, {
        type: "raster",
        tiles: ["https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "OpenSeaMap",
      });
      map.addLayer({ id: SEAMARK_ID, type: "raster", source: SEAMARK_ID });

      // Beta: WMS pubblici EMODnet. Se il servizio non risponde, MapLibre
      // mostra semplicemente tile vuote (nessun errore bloccante).
      map.addSource(BATHY_ID, {
        type: "raster",
        tiles: [
          "https://ows.emodnet-bathymetry.eu/wms?service=WMS&version=1.3.0&request=GetMap&layers=emodnet:mean_atlas_land&styles=&format=image/png&transparent=true&width=256&height=256&crs=EPSG:3857&bbox={bbox-epsg-3857}",
        ],
        tileSize: 256,
        attribution: "EMODnet Bathymetry",
      });
      map.addLayer({
        id: BATHY_ID,
        type: "raster",
        source: BATHY_ID,
        paint: { "raster-opacity": 0.55 },
        layout: { visibility: "none" },
      });

      map.addSource(MPA_ID, {
        type: "raster",
        tiles: [
          "https://ows.emodnet-humanactivities.eu/wms?service=WMS&version=1.3.0&request=GetMap&layers=natura2000areas&styles=&format=image/png&transparent=true&width=256&height=256&crs=EPSG:3857&bbox={bbox-epsg-3857}",
        ],
        tileSize: 256,
        attribution: "EMODnet Human Activities (Natura2000)",
      });
      map.addLayer({
        id: MPA_ID,
        type: "raster",
        source: MPA_ID,
        paint: { "raster-opacity": 0.5 },
        layout: { visibility: "none" },
      });

      map.addSource(CIRCLE_SOURCE_ID, { type: "geojson", data: EMPTY_FC });
      map.addLayer({
        id: `${CIRCLE_SOURCE_ID}-fill`,
        type: "fill",
        source: CIRCLE_SOURCE_ID,
        paint: { "fill-color": "#2dd4bf", "fill-opacity": 0.15 },
      });
      map.addLayer({
        id: `${CIRCLE_SOURCE_ID}-line`,
        type: "line",
        source: CIRCLE_SOURCE_ID,
        paint: { "line-color": "#2dd4bf", "line-width": 2 },
      });

      if (initialCenter) placeMarker(initialCenter);
      setMapReady(true);
    });

    map.on("click", (e) => {
      const p = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      placeMarker(p);
      setPoint(p);
      onPickRef.current(p);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource(CIRCLE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (!source) return;
    source.setData(point && radiusM ? circleGeoJSON(point, radiusM) : EMPTY_FC);
  }, [point, radiusM]);

  useEffect(() => {
    if (!mapReady) return;
    mapRef.current?.setLayoutProperty(SEAMARK_ID, "visibility", showSeamark ? "visible" : "none");
  }, [showSeamark, mapReady]);

  useEffect(() => {
    if (!mapReady) return;
    mapRef.current?.setLayoutProperty(BATHY_ID, "visibility", showBathy ? "visible" : "none");
  }, [showBathy, mapReady]);

  useEffect(() => {
    if (!mapReady) return;
    mapRef.current?.setLayoutProperty(MPA_ID, "visibility", showMpa ? "visible" : "none");
  }, [showMpa, mapReady]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-body text-foam/60">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={showSeamark}
            onChange={(e) => setShowSeamark(e.target.checked)}
            className="accent-tide"
          />
          Segnalamenti nautici
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={showBathy}
            onChange={(e) => setShowBathy(e.target.checked)}
            className="accent-tide"
          />
          Batimetria (beta)
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={showMpa}
            onChange={(e) => setShowMpa(e.target.checked)}
            className="accent-tide"
          />
          Aree protette (beta)
        </label>
      </div>

      <div
        ref={containerRef}
        className="w-full h-[360px] rounded-xl overflow-hidden border border-hull/40"
      />

      <p className="text-[11px] text-foam/40 font-body">
        Tocca la mappa per scegliere un punto (o trascina il marker). Layer &quot;beta&quot;:
        servizi WMS pubblici esterni, copertura/disponibilità non garantite.
      </p>
    </div>
  );
}
