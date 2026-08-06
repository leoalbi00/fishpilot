"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const SST_ID = "copernicus-sst";
const CHL_ID = "copernicus-chl";

// Copernicus Marine Service (CMEMS): WMS via il gateway THREDDS storico
// (nrt.cmems-du.eu), stesso schema OGC WMS 1.3.0 già usato per i layer
// EMODnet. Dal 2023 CMEMS richiede sempre più spesso un account gratuito
// anche per l'accesso ai tile: senza credenziali configurate qui i layer
// possono restare vuoti invece di renderizzare — comportamento "beta"
// identico a EMODnet, mai un errore bloccante per la mappa.
const SST_TILE_URL =
  "https://nrt.cmems-du.eu/thredds/wms/cmems_mod_glo_phy_anfc_0.083deg_P1D-m?" +
  "service=WMS&version=1.3.0&request=GetMap&layers=thetao&elevation=-0.49&" +
  "styles=boxfill/rainbow&format=image/png&transparent=true&width=256&height=256&crs=EPSG:3857&bbox={bbox-epsg-3857}";

const CHL_TILE_URL =
  "https://nrt.cmems-du.eu/thredds/wms/cmems_mod_glo_bgc-pft_anfc_0.25deg_P1D-m?" +
  "service=WMS&version=1.3.0&request=GetMap&layers=chl&elevation=-0.49&" +
  "styles=boxfill/rainbow&format=image/png&transparent=true&width=256&height=256&crs=EPSG:3857&bbox={bbox-epsg-3857}";

/** Layer satellitari Copernicus Marine (SST, Clorofilla-a): mappa "beta"
 * best-effort, indipendente dallo spot selezionato altrove nell'app. Le
 * correnti marine live sono già mostrate come dato puntuale in Traversata
 * e Rada (Open-Meteo Marine API): qui non c'è un singolo layer raster WMS
 * pubblico equivalente per il vettore corrente, quindi non viene proposto
 * come toggle per non promettere un layer che strutturalmente non esiste. */
export default function CopernicusMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [showSst, setShowSst] = useState(false);
  const [showChl, setShowChl] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/dark",
      center: [14, 38],
      zoom: 5,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      map.addSource(SST_ID, {
        type: "raster",
        tiles: [SST_TILE_URL],
        tileSize: 256,
        attribution: "Copernicus Marine Service",
      });
      map.addLayer({
        id: SST_ID,
        type: "raster",
        source: SST_ID,
        paint: { "raster-opacity": 0.65 },
        layout: { visibility: "none" },
      });

      map.addSource(CHL_ID, {
        type: "raster",
        tiles: [CHL_TILE_URL],
        tileSize: 256,
        attribution: "Copernicus Marine Service",
      });
      map.addLayer({
        id: CHL_ID,
        type: "raster",
        source: CHL_ID,
        paint: { "raster-opacity": 0.65 },
        layout: { visibility: "none" },
      });

      setMapReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Cambiare la visibilità di un layer prima che lo stile sia pronto lancia
  // un errore MapLibre: attende mapReady (stesso fix già applicato a MapPicker).
  useEffect(() => {
    if (!mapReady) return;
    mapRef.current?.setLayoutProperty(SST_ID, "visibility", showSst ? "visible" : "none");
  }, [showSst, mapReady]);

  useEffect(() => {
    if (!mapReady) return;
    mapRef.current?.setLayoutProperty(CHL_ID, "visibility", showChl ? "visible" : "none");
  }, [showChl, mapReady]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-body text-foam/60">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={showSst}
            onChange={(e) => setShowSst(e.target.checked)}
            className="accent-tide"
          />
          Temperatura mare — SST (beta)
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={showChl}
            onChange={(e) => setShowChl(e.target.checked)}
            className="accent-tide"
          />
          Clorofilla-a (beta)
        </label>
      </div>

      <div
        ref={containerRef}
        className="w-full h-[420px] rounded-xl overflow-hidden border border-hull/40"
      />

      <p className="text-[11px] text-foam/40 font-body">
        Layer &quot;beta&quot;: servizio Copernicus Marine Service pubblico, spesso soggetto ad
        autenticazione CMEMS gratuita non configurata in questa build — se non caricano, i tile
        restano vuoti. Le correnti marine live sono già mostrate come dato puntuale nelle schede
        Meteo Marino di Traversata e Rada (Open-Meteo).
      </p>
    </div>
  );
}
