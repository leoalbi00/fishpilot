"use client";

import { useEffect, useRef, useState } from "react";
import { AlarmSiren } from "@/lib/audioAlarm";
import { bearingDeg, distanceM } from "@/lib/navigation";
import { degToCompass } from "@/lib/utils";

interface MobButtonProps {
  position: GeolocationPosition | null;
}

/** Tasto di emergenza Uomo a Mare: cattura la posizione GPS esatta al
 * momento dell'attivazione (fix dedicato ad alta precisione, non l'ultimo
 * punto della traccia condivisa), attiva un segnale acustico continuo e
 * mostra prua/distanza di ritorno live mentre la barca si allontana. */
export default function MobButton({ position }: MobButtonProps) {
  // "activated" governa la sirena/UI di allarme ed è indipendente da "mob"
  // (il fix GPS): se getCurrentPosition fallisce, l'allarme deve comunque
  // restare attivo e mostrare il pulsante "Disattiva" — altrimenti la
  // sirena continuerebbe a suonare senza alcun modo per fermarla.
  const [activated, setActivated] = useState(false);
  const [mob, setMob] = useState<{ lat: number; lng: number; capturedAtISO: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sirenRef = useRef<AlarmSiren | null>(null);

  function activate() {
    setError(null);
    if (!navigator.geolocation) {
      setError("Il tuo browser non supporta la geolocalizzazione: allarme attivato senza posizione.");
    }

    // Creata dentro il click (gesto utente esplicito): richiesto dalle
    // policy autoplay dei browser per poter suonare subito dopo. La sirena
    // parte subito, senza aspettare il fix GPS: l'allarme non deve mai
    // dipendere dalla riuscita della geolocalizzazione.
    const siren = new AlarmSiren();
    siren.start();
    sirenRef.current = siren;
    siren.sound();
    setActivated(true);

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMob({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          capturedAtISO: new Date().toISOString(),
        });
      },
      () => {
        setError("Impossibile ottenere un fix GPS: prua e distanza di ritorno non disponibili.");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }

  function deactivate() {
    sirenRef.current?.stop();
    sirenRef.current = null;
    setActivated(false);
    setMob(null);
    setError(null);
  }

  useEffect(() => {
    return () => {
      sirenRef.current?.stop();
    };
  }, []);

  if (!activated) {
    return (
      <button
        type="button"
        onClick={activate}
        className="w-full min-h-[64px] rounded-xl bg-danger text-white font-display font-bold text-lg tracking-wide shadow-[0_0_25px_rgba(255,107,87,0.5)] hover:shadow-[0_0_35px_rgba(255,107,87,0.7)] active:scale-[0.98] transition-all"
      >
        🆘 MOB — Uomo a Mare
      </button>
    );
  }

  const current =
    position && { latitude: position.coords.latitude, longitude: position.coords.longitude };
  const mobPoint = mob && { latitude: mob.lat, longitude: mob.lng };
  const returnBearing = current && mobPoint ? bearingDeg(current, mobPoint) : null;
  const returnDistanceM = current && mobPoint ? distanceM(current, mobPoint) : null;

  return (
    <div className="rounded-xl border-2 border-danger bg-danger/10 p-5 space-y-3 animate-pulse">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-danger text-lg font-bold">🆘 UOMO A MARE</h3>
        {mob && (
          <span className="font-mono text-xs text-danger">
            {new Date(mob.capturedAtISO).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-abyss/50 border border-danger/40 p-3 text-center">
          <p className="text-[10px] font-mono uppercase tracking-widest text-foam/50">Prua di ritorno</p>
          <p className="font-mono text-2xl text-danger mt-1 tabular-nums">
            {returnBearing !== null ? Math.round(returnBearing) : "—"}
            <span className="text-sm ml-0.5">° {returnBearing !== null ? degToCompass(returnBearing) : ""}</span>
          </p>
        </div>
        <div className="rounded-lg bg-abyss/50 border border-danger/40 p-3 text-center">
          <p className="text-[10px] font-mono uppercase tracking-widest text-foam/50">Distanza</p>
          <p className="font-mono text-2xl text-danger mt-1 tabular-nums">
            {returnDistanceM !== null ? returnDistanceM.toFixed(0) : "—"}
            <span className="text-sm ml-0.5">m</span>
          </p>
        </div>
      </div>

      <p className="text-xs text-foam/60 font-mono">
        {mob
          ? `Posizione MOB: ${mob.lat.toFixed(5)}, ${mob.lng.toFixed(5)}`
          : "In attesa del fix GPS…"}
      </p>

      <button
        type="button"
        onClick={deactivate}
        className="w-full min-h-[48px] rounded-lg border border-danger text-danger font-body font-medium hover:bg-danger/10 transition-colors"
      >
        Disattiva allarme MOB
      </button>

      {error && (
        <p className="text-xs text-danger font-body" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
