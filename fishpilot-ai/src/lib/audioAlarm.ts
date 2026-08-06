// ============================================================
// /lib/audioAlarm.ts — Sirena Web Audio riusabile
//
// Usata da AnchorWatch (allarme ancora) e dal pulsante MOB del
// Chartplotter (uomo a mare): gestisce un unico AudioContext/oscillatore
// persistente, creato al momento dell'armamento (gesto utente esplicito,
// richiesto dalle policy autoplay dei browser) e tenuto silenzioso finché
// non serve — evita di dover ricreare il contesto audio nel momento
// critico in cui l'allarme scatta (magari minuti/ore dopo, fuori da un
// gesto utente).
// ============================================================

const SIREN_TONE_MS = 280;
const SIREN_HIGH_HZ = 880;
const SIREN_LOW_HZ = 587;
const ALARM_GAIN = 0.55;

type AudioCtxCtor = typeof AudioContext;

export class AlarmSiren {
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
