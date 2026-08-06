"use client";

import { useCallback, useEffect, useState } from "react";
import { degToCompass, msToKnots } from "@/lib/utils";

interface DeviceOrientationEventiOS {
  requestPermission?: () => Promise<"granted" | "denied">;
}

interface ChartplotterGaugesProps {
  position: GeolocationPosition | null;
  gpsError: string | null;
}

function Gauge({ label, value, unit, sub }: { label: string; value: string; unit?: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-hull/40 bg-abyss/50 p-4 text-center">
      <p className="text-[10px] font-mono uppercase tracking-widest text-foam/45">{label}</p>
      <p className="font-mono text-2xl text-foam mt-1.5 tabular-nums">
        {value}
        {unit && <span className="text-sm text-foam/50 ml-0.5">{unit}</span>}
      </p>
      {sub && <p className="text-xs text-foam/50 mt-0.5">{sub}</p>}
    </div>
  );
}

/** Quadro strumenti digitale stile chartplotter: SOG/COG da GPS (posizione
 * condivisa dalla pagina, un solo watchPosition per tutta la schermata),
 * bussola magnetica e inclinometro (pitch/roll) da sensori di movimento
 * dello smartphone. Tutti dati reali del dispositivo — nessuna simulazione
 * — con degradazione onesta quando un sensore non è disponibile o il
 * permesso viene negato. */
export default function ChartplotterGauges({ position, gpsError }: ChartplotterGaugesProps) {
  const [compassDeg, setCompassDeg] = useState<number | null>(null);
  const [pitchDeg, setPitchDeg] = useState<number | null>(null);
  const [rollDeg, setRollDeg] = useState<number | null>(null);
  const [motionState, setMotionState] = useState<"idle" | "active" | "denied" | "unsupported">(
    "idle"
  );

  const sogKn =
    position && typeof position.coords.speed === "number"
      ? msToKnots(Math.max(0, position.coords.speed))
      : null;
  const cogDeg =
    position && typeof position.coords.heading === "number" && !Number.isNaN(position.coords.heading)
      ? position.coords.heading
      : null;

  // Stabile tra i render (solo setState, identità garantite da React): la
  // stessa identità di funzione deve restare valida tra l'addEventListener
  // (dentro enableMotionSensors, dopo un click) e il removeEventListener
  // nella cleanup dell'effect qui sotto, altrimenti il browser non
  // rimuoverebbe il listener giusto e la sottoscrizione resterebbe attiva
  // anche dopo lo smontaggio del componente.
  const handleOrientationEvent = useCallback((e: DeviceOrientationEvent) => {
    // iOS Safari espone webkitCompassHeading già come rotta bussola vera
    // (0=Nord, in senso orario): nessuna conversione necessaria.
    const iosHeading = (e as unknown as { webkitCompassHeading?: number }).webkitCompassHeading;
    if (typeof iosHeading === "number") {
      setCompassDeg(iosHeading);
    } else if (e.absolute && typeof e.alpha === "number") {
      // Convenzione Android/W3C: alpha cresce in senso antiorario da Nord.
      setCompassDeg((360 - e.alpha) % 360);
    }

    if (typeof e.beta === "number") setPitchDeg(e.beta);
    if (typeof e.gamma === "number") setRollDeg(e.gamma);
  }, []);

  async function enableMotionSensors() {
    const DOE = window.DeviceOrientationEvent as unknown as DeviceOrientationEventiOS | undefined;

    try {
      // iOS 13+: richiede un permesso esplicito, concedibile solo dentro un
      // gesto utente diretto (questo click).
      if (DOE && typeof DOE.requestPermission === "function") {
        const result = await DOE.requestPermission();
        if (result !== "granted") {
          setMotionState("denied");
          return;
        }
      }
      if (!("DeviceOrientationEvent" in window)) {
        setMotionState("unsupported");
        return;
      }
      window.addEventListener("deviceorientation", handleOrientationEvent);
      setMotionState("active");
    } catch {
      setMotionState("unsupported");
    }
  }

  useEffect(() => {
    return () => {
      window.removeEventListener("deviceorientation", handleOrientationEvent);
    };
  }, []);

  return (
    <div className="rounded-xl border border-hull/40 bg-depth/60 p-5 space-y-4">
      <h3 className="font-display text-foam text-lg">Quadro Strumenti Digitale</h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Gauge
          label="SOG"
          value={sogKn !== null ? sogKn.toFixed(1) : "—"}
          unit="kn"
          sub="Velocità sul fondo (GPS)"
        />
        <Gauge
          label="COG"
          value={cogDeg !== null ? Math.round(cogDeg).toString() : "—"}
          unit={cogDeg !== null ? `° ${degToCompass(cogDeg)}` : "°"}
          sub="Rotta sul fondo (GPS)"
        />
        <Gauge
          label="Bussola"
          value={compassDeg !== null ? Math.round(compassDeg).toString() : "—"}
          unit={compassDeg !== null ? `° ${degToCompass(compassDeg)}` : "°"}
          sub="Prua magnetica"
        />
        <Gauge
          label="Sbandamento"
          value={
            pitchDeg !== null && rollDeg !== null
              ? `${pitchDeg.toFixed(0)}/${rollDeg.toFixed(0)}`
              : "—"
          }
          unit="°"
          sub="Beccheggio / Rollio"
        />
      </div>

      {motionState !== "active" && (
        <button
          type="button"
          onClick={enableMotionSensors}
          className="w-full min-h-[48px] rounded-lg border border-tide/50 text-tide font-body hover:bg-tide/10 active:scale-[0.98] transition-all"
        >
          🧭 Attiva bussola e inclinometro
        </button>
      )}

      {motionState === "denied" && (
        <p className="text-xs text-danger font-body">
          Permesso ai sensori di movimento negato: abilitalo dalle impostazioni del browser per
          usare bussola e inclinometro.
        </p>
      )}
      {motionState === "unsupported" && (
        <p className="text-xs text-foam/50 font-body">
          Questo dispositivo/browser non espone i sensori di movimento (magnetometro/giroscopio):
          bussola e inclinometro non disponibili.
        </p>
      )}
      {gpsError && (
        <p className="text-xs text-danger font-body" role="alert">
          {gpsError}
        </p>
      )}

      <p className="text-[11px] text-foam/35 font-body pt-1 border-t border-hull/30">
        Dati letti dai sensori del dispositivo (GPS, magnetometro, giroscopio): precisione
        variabile per modello/installazione. Bussola e inclinometro richiedono il telefono
        montato piatto e allineato con la prua; calibra la bussola con un movimento a otto se le
        letture sembrano instabili. Non sostituiscono strumentazione nautica certificata.
      </p>
    </div>
  );
}
