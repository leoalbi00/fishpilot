"use client";

import { useEffect, useRef, useState } from "react";
import { haversineDistanceM } from "@/lib/utils";

const DEFAULT_RADIUS_M = 30;
const SIREN_TONE_MS = 280;
const SIREN_HIGH_HZ = 880;
const SIREN_LOW_HZ = 587;
const ALARM_GAIN = 0.55;

type AudioCtxCtor = typeof AudioContext;

/** Gestisce un unico AudioContext/oscillatore persistente, creato al momento
 * dell'armamento (gesto utente esplicito, richiesto dalle policy autoplay
 * dei browser) e tenuto silenzioso finché non serve: evita di dover
 * ricreare il contesto audio nel momento critico in cui l'allarme scatta
 * (magari minuti/ore dopo, fuori da un gesto utente). */
class AlarmSiren {
  private ctx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private toneInterval: ReturnType<typeof setInterval> | null = null;

  start() {
    if (this.ctx) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: AudioCtxCtor }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = SIREN_HIGH_HZ;
      gain.gain.value = 0; // silenzioso finché l'allarme non scatta davvero
      osc.connect(gain).connect(ctx.destination);
      osc.start();

      this.ctx = ctx;
      this.osc = osc;
      this.gain = gain;
    } catch {
      // Web Audio non disponibile: resta comunque il banner visivo lampeggiante.
    }
  }

  sound() {
    if (!this.ctx || !this.osc || !this.gain || this.toneInterval) return;
    this.ctx.resume().catch(() => {});
    this.gain.gain.setValueAtTime(ALARM_GAIN, this.ctx.currentTime);

    let high = true;
    this.toneInterval = setInterval(() => {
      if (!this.ctx || !this.osc) return;
      high = !high;
      this.osc.frequency.setValueAtTime(high ? SIREN_HIGH_HZ : SIREN_LOW_HZ, this.ctx.currentTime);
    }, SIREN_TONE_MS);
  }

  silence() {
    if (this.toneInterval !== null) {
      clearInterval(this.toneInterval);
      this.toneInterval = null;
    }
    this.gain?.gain.setValueAtTime(0, this.ctx?.currentTime ?? 0);
  }

  stop() {
    this.silence();
    try {
      this.osc?.stop();
    } catch {
      // già fermato
    }
    this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.osc = null;
    this.gain = null;
  }
}

/** Allarme Ancora GPS: monitora la posizione e avvisa (visivo + sonoro, un
 * segnale a due toni continuo e ad alto volume) se si esce dal raggio di
 * sicurezza impostato attorno al punto di ancoraggio. */
export default function AnchorWatch() {
  const [radius, setRadius] = useState(DEFAULT_RADIUS_M);
  const [armed, setArmed] = useState(false);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [alarm, setAlarm] = useState(false);
  const [silenced, setSilenced] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const sirenRef = useRef<AlarmSiren | null>(null);

  function handleDisarm() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    sirenRef.current?.stop();
    sirenRef.current = null;
    setArmed(false);
    setCenter(null);
    setDistance(null);
    setAlarm(false);
    setSilenced(false);
  }

  function handleArm() {
    setError(null);
    if (!navigator.geolocation) {
      setError("Il tuo browser non supporta la geolocalizzazione.");
      return;
    }

    // Creato qui, dentro un gesto utente esplicito (click): i browser
    // richiedono un'interazione diretta per poter riprodurre audio più tardi.
    const siren = new AlarmSiren();
    siren.start();
    sirenRef.current = siren;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const origin = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(origin);
        setArmed(true);
        setDistance(0);
        setSilenced(false);

        watchIdRef.current = navigator.geolocation.watchPosition(
          (p) => {
            const current = { lat: p.coords.latitude, lng: p.coords.longitude };
            const d = haversineDistanceM(
              { latitude: origin.lat, longitude: origin.lng },
              { latitude: current.lat, longitude: current.lng }
            );
            setDistance(d);
          },
          () => setError("Segnale GPS perso: verifica la posizione manualmente."),
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
        );
      },
      () => setError("Impossibile ottenere la posizione GPS attuale."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // Attiva/disattiva l'allarme quando la distanza supera il raggio.
  useEffect(() => {
    if (distance === null) return;
    const outOfRange = distance > radius;

    if (outOfRange && !alarm) {
      setAlarm(true);
      setSilenced(false);
    } else if (!outOfRange && alarm) {
      setAlarm(false);
      setSilenced(false);
    }
  }, [distance, radius, alarm]);

  // Suona/silenzia la sirena in base allo stato dell'allarme.
  useEffect(() => {
    if (alarm && !silenced) {
      sirenRef.current?.sound();
    } else {
      sirenRef.current?.silence();
    }
  }, [alarm, silenced]);

  // Pulizia al momento dello smontaggio del componente.
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      sirenRef.current?.stop();
    };
  }, []);

  return (
    <div
      className={`rounded-xl border p-5 space-y-4 transition-colors ${
        alarm
          ? "border-danger bg-danger/10 animate-pulse"
          : "border-hull/40 bg-depth/60"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-foam text-lg">Allarme Ancora GPS</h3>
        {armed && (
          <span
            className={`text-xs font-mono uppercase tracking-widest px-2 py-1 rounded-full ${
              alarm ? "bg-danger text-abyss" : "bg-tide/20 text-tide"
            }`}
          >
            {alarm ? "Fuori raggio!" : "Attivo"}
          </span>
        )}
      </div>

      {!armed ? (
        <>
          <label className="block">
            <span className="block text-xs font-mono uppercase tracking-widest text-foam/50 mb-1.5">
              Raggio di sicurezza: {radius} m
            </span>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full accent-signal h-6"
            />
          </label>

          <button
            type="button"
            onClick={handleArm}
            className="w-full min-h-[48px] rounded-lg bg-signal text-abyss font-display font-semibold py-3 text-base tracking-wide hover:shadow-[0_0_25px_rgba(255,178,56,0.45)] transition-all"
          >
            ⚓ Arma allarme (dai fondo qui)
          </button>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-abyss/50 border border-hull/40 p-3 text-center">
              <p className="text-[10px] font-mono uppercase tracking-widest text-foam/45">
                Distanza dall&apos;ancora
              </p>
              <p
                className={`font-mono text-2xl mt-1 tabular-nums ${
                  alarm ? "text-danger" : "text-foam"
                }`}
              >
                {distance !== null ? distance.toFixed(0) : "—"}
                <span className="text-sm text-foam/50 ml-0.5">m</span>
              </p>
            </div>
            <div className="rounded-lg bg-abyss/50 border border-hull/40 p-3 text-center">
              <p className="text-[10px] font-mono uppercase tracking-widest text-foam/45">
                Raggio impostato
              </p>
              <p className="font-mono text-2xl mt-1 tabular-nums text-foam">
                {radius}
                <span className="text-sm text-foam/50 ml-0.5">m</span>
              </p>
            </div>
          </div>

          {alarm && (
            <p className="text-danger text-sm font-body flex items-center gap-2" role="alert">
              <span aria-hidden>⚠</span> La barca è uscita dal raggio di sicurezza!
            </p>
          )}

          <div className="flex gap-2">
            {alarm && !silenced && (
              <button
                type="button"
                onClick={() => setSilenced(true)}
                className="flex-1 min-h-[48px] rounded-lg border border-danger text-danger font-body font-medium hover:bg-danger/10 transition-colors"
              >
                Silenzia
              </button>
            )}
            <button
              type="button"
              onClick={handleDisarm}
              className="flex-1 min-h-[48px] rounded-lg border border-hull/50 text-foam/70 font-body hover:border-tide/60 hover:text-foam transition-colors"
            >
              Disarma
            </button>
          </div>
        </>
      )}

      {error && (
        <p className="text-danger text-sm font-body" role="alert">
          {error}
        </p>
      )}

      <p className="text-[11px] text-foam/35 font-body pt-1">
        Richiede che questa pagina resti aperta sul dispositivo. Tieni sempre anche un
        riscontro visivo/radar della posizione, come backup.
      </p>
    </div>
  );
}
