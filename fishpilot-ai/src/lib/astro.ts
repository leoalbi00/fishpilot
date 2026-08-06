// ============================================================
// /lib/astro.ts
//
// Astronomia di base (posizione Sole/Luna, sorgere/tramonto/culminazione
// lunare, fase lunare) usata da /lib/solunar.ts e /lib/tides.ts.
//
// Implementazione "low-precision" secondo il metodo di Paul Schlyter
// (dominio pubblico, http://www.stjarnhimlen.se/comp/ppcomp.html),
// accuratezza tipica di qualche primo d'arco: ampiamente sufficiente per
// tabelle solunari e stime di marea astronomica, e permette di girare
// interamente offline (nessuna chiamata di rete), coerente con l'obiettivo
// PWA dell'app.
// ============================================================

const DEG = Math.PI / 180;

const sinD = (deg: number) => Math.sin(deg * DEG);
const cosD = (deg: number) => Math.cos(deg * DEG);
const atan2D = (y: number, x: number) => Math.atan2(y, x) / DEG;
const asinD = (v: number) => Math.asin(Math.max(-1, Math.min(1, v))) / DEG;

/** Normalizza un angolo in gradi nell'intervallo [0, 360). */
function norm360(deg: number): number {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

/** Normalizza un angolo in gradi nell'intervallo [-180, 180). */
function norm180(deg: number): number {
  let d = norm360(deg);
  if (d >= 180) d -= 360;
  return d;
}

/** Giorni (frazionari) trascorsi dall'epoca 1999-12-31 00:00 UT (Schlyter). */
function daysSinceEpoch(date: Date): number {
  const epoch = Date.UTC(1999, 11, 31, 0, 0, 0);
  return (date.getTime() - epoch) / 86400000;
}

/** Obliquità dell'eclittica (gradi) alla data. */
function obliquity(d: number): number {
  return 23.4393 - 3.563e-7 * d;
}

interface EquatorialPos {
  raDeg: number; // Ascensione retta, 0-360
  decDeg: number; // Declinazione, -90..90
}

interface SunPosition extends EquatorialPos {
  meanLonDeg: number; // longitudine media (usata per il tempo siderale)
  trueLonDeg: number;
}

/** Posizione geocentrica del Sole (approssimazione a bassa precisione). */
function sunPosition(d: number): SunPosition {
  const w = 282.9404 + 4.70935e-5 * d; // argomento del perielio
  const e = 0.016709 - 1.151e-9 * d; // eccentricità
  const M = norm360(356.047 + 0.9856002585 * d); // anomalia media
  const E = M + (e * 180) / Math.PI * sinD(M) * (1 + e * cosD(M));

  const xv = cosD(E) - e;
  const yv = Math.sqrt(1 - e * e) * sinD(E);
  const trueAnomaly = atan2D(yv, xv);

  const trueLonDeg = norm360(trueAnomaly + w);
  const meanLonDeg = norm360(M + w);
  const ecl = obliquity(d);

  // Eclittica (lat=0 per il Sole) -> equatoriale.
  const xEq = cosD(trueLonDeg);
  const yEq = sinD(trueLonDeg) * cosD(ecl);
  const zEq = sinD(trueLonDeg) * sinD(ecl);

  return {
    raDeg: norm360(atan2D(yEq, xEq)),
    decDeg: asinD(zEq),
    meanLonDeg,
    trueLonDeg,
  };
}

interface MoonPosition extends EquatorialPos {
  distanceEarthRadii: number;
}

/** Posizione geocentrica della Luna (approssimazione a bassa precisione,
 * con termini di perturbazione principali: precisione tipica 1-2 primi
 * d'arco, più che sufficiente per sorgere/tramonto/culminazione). */
function moonPosition(d: number): MoonPosition {
  const sun = sunPosition(d);

  const N = norm360(125.1228 - 0.0529538083 * d);
  const i = 5.1454;
  const w = norm360(318.0634 + 0.1643573223 * d);
  const a = 60.2666; // raggi terrestri
  const e = 0.0549;
  const M = norm360(115.3654 + 13.064992958 * d);

  let E = M + (180 / Math.PI) * e * sinD(M) * (1 + e * cosD(M));
  for (let k = 0; k < 3; k++) {
    const dE =
      (E - (180 / Math.PI) * e * sinD(E) - M) / (1 - e * cosD(E));
    E -= dE;
  }

  const xv = a * (cosD(E) - e);
  const yv = a * (Math.sqrt(1 - e * e) * sinD(E));
  const v = atan2D(yv, xv);
  const r = Math.sqrt(xv * xv + yv * yv);

  const lonEcl0 = norm360(v + w);

  const xh = r * (cosD(N) * cosD(lonEcl0) - sinD(N) * sinD(lonEcl0) * cosD(i));
  const yh = r * (sinD(N) * cosD(lonEcl0) + cosD(N) * sinD(lonEcl0) * cosD(i));
  const zh = r * (sinD(lonEcl0) * sinD(i));

  let lon = atan2D(yh, xh);
  let lat = atan2D(zh, Math.sqrt(xh * xh + yh * yh));

  // Perturbazioni principali (Schlyter): Sole/Luna in gioco.
  const Ms = norm360(356.047 + 0.9856002585 * d); // anomalia media Sole
  const Lm = norm360(N + w + M); // longitudine media Luna
  const Ls = sun.meanLonDeg; // longitudine media Sole
  const D = norm360(Lm - Ls); // elongazione media
  const F = norm360(Lm - N); // argomento di latitudine

  lon +=
    -1.274 * sinD(M - 2 * D) +
    0.658 * sinD(2 * D) -
    0.186 * sinD(Ms) -
    0.059 * sinD(2 * M - 2 * D) -
    0.057 * sinD(M - 2 * D + Ms) +
    0.053 * sinD(M + 2 * D) +
    0.046 * sinD(2 * D - Ms) +
    0.041 * sinD(M - Ms) -
    0.035 * sinD(D) -
    0.031 * sinD(M + Ms) -
    0.015 * sinD(2 * F - 2 * D) +
    0.011 * sinD(M - 4 * D);

  lat +=
    -0.173 * sinD(F - 2 * D) -
    0.055 * sinD(M - F - 2 * D) -
    0.046 * sinD(M + F - 2 * D) +
    0.033 * sinD(F + 2 * D) +
    0.017 * sinD(2 * M + F);

  const rCorr = r - 0.58 * cosD(M - 2 * D) - 0.46 * cosD(2 * D);

  const ecl = obliquity(d);
  const xg = rCorr * cosD(lon) * cosD(lat);
  const yg = rCorr * sinD(lon) * cosD(lat);
  const zg = rCorr * sinD(lat);

  const xe = xg;
  const ye = yg * cosD(ecl) - zg * sinD(ecl);
  const ze = yg * sinD(ecl) + zg * cosD(ecl);

  return {
    raDeg: norm360(atan2D(ye, xe)),
    decDeg: asinD(ze / rCorr),
    distanceEarthRadii: rCorr,
  };
}

/** Tempo siderale locale (gradi) per data/ora UT e longitudine Est (gradi). */
function localSiderealTimeDeg(d: number, utHours: number, lonEastDeg: number): number {
  const sun = sunPosition(d);
  const gmst0 = norm360(sun.meanLonDeg + 180);
  const gmst = norm360(gmst0 + utHours * 15);
  return norm360(gmst + lonEastDeg);
}

/** Angolo orario (gradi, -180..180) di un corpo con data ascensione retta. */
function hourAngleDeg(lstDeg: number, raDeg: number): number {
  return norm180(lstDeg - raDeg);
}

/** Altezza sull'orizzonte (gradi) di un corpo con dec/HA note, per una data latitudine. */
function altitudeDeg(latDeg: number, decDeg: number, haDeg: number): number {
  return asinD(sinD(latDeg) * sinD(decDeg) + cosD(latDeg) * cosD(decDeg) * cosD(haDeg));
}

function utHoursOf(date: Date): number {
  return (
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600 +
    date.getUTCMilliseconds() / 3600000
  );
}

/** Altezza lunare sull'orizzonte (gradi) all'istante `date` per lat/lon date. */
export function moonAltitudeDeg(date: Date, latDeg: number, lonEastDeg: number): number {
  const d = daysSinceEpoch(date);
  const moon = moonPosition(d);
  const lst = localSiderealTimeDeg(d, utHoursOf(date), lonEastDeg);
  const ha = hourAngleDeg(lst, moon.raDeg);
  return altitudeDeg(latDeg, moon.decDeg, ha);
}

/** Soglia di altezza (gradi) per sorgere/tramonto lunare: rifrazione +
 * semidiametro - parallasse, dipendente dalla distanza Terra-Luna. */
function moonRiseSetThresholdDeg(date: Date): number {
  const d = daysSinceEpoch(date);
  const moon = moonPosition(d);
  const parallax = asinD(1 / moon.distanceEarthRadii);
  return 0.7275 * parallax - 0.5666;
}

/** Angolo orario lunare "srotolato" (continuo, non wrappato mod 360) — usato
 * per individuare culminazione (HA=0) e anti-culminazione (HA=180) tramite
 * bisezione senza ambiguità di wraparound. */
function unwrappedMoonHourAngle(date: Date, lonEastDeg: number): number {
  const d = daysSinceEpoch(date);
  const moon = moonPosition(d);
  const lst = localSiderealTimeDeg(d, utHoursOf(date), lonEastDeg);
  return lst - moon.raDeg; // non normalizzato
}

function bisect(
  fn: (t: number) => number,
  loMs: number,
  hiMs: number,
  iterations = 30
): number {
  let lo = loMs;
  let hi = hiMs;
  let fLo = fn(lo);
  for (let i = 0; i < iterations; i++) {
    const mid = (lo + hi) / 2;
    const fMid = fn(mid);
    if (Math.sign(fMid) === Math.sign(fLo)) {
      lo = mid;
      fLo = fMid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}

export interface MoonEvents {
  rise: Date | null;
  set: Date | null;
  transit: Date | null; // culminazione superiore (massima altezza)
  antitransit: Date | null; // culminazione inferiore ("luna sotto i piedi")
  phase: number; // 0-1, 0/1 = luna nuova, 0.5 = piena
  illumination: number; // 0-1, frazione di disco illuminato
  phaseLabel: string;
}

/**
 * Sorgere/tramonto/culminazioni lunari e fase lunare per il giorno locale
 * che contiene `localNoon` (un Date qualsiasi di quel giorno), a lat/lon
 * date. Esegue una scansione oraria + bisezione: robusto rispetto al
 * wraparound dell'angolo orario, costo trascurabile (~50 valutazioni).
 */
export function computeMoonEvents(
  referenceDate: Date,
  latDeg: number,
  lonEastDeg: number
): MoonEvents {
  const dayStart = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth(),
      referenceDate.getUTCDate(),
      0,
      0,
      0
    )
  );
  const startMs = dayStart.getTime() - 6 * 3600000; // margine per catturare eventi a cavallo
  const endMs = dayStart.getTime() + 30 * 3600000;
  const stepMs = 20 * 60000; // campionamento ogni 20 minuti

  const threshold = moonRiseSetThresholdDeg(referenceDate);

  let rise: Date | null = null;
  let set: Date | null = null;
  let transit: Date | null = null;
  let antitransit: Date | null = null;

  let prevAltAdj: number | null = null;
  let prevHaUnwrapped: number | null = null;
  let haOffset = 0;

  for (let t = startMs; t <= endMs; t += stepMs) {
    const date = new Date(t);
    const altAdj = moonAltitudeDeg(date, latDeg, lonEastDeg) - threshold;

    if (prevAltAdj !== null && Math.sign(altAdj) !== Math.sign(prevAltAdj)) {
      const eventMs = bisect(
        (ms) => moonAltitudeDeg(new Date(ms), latDeg, lonEastDeg) - threshold,
        t - stepMs,
        t
      );
      const eventDate = new Date(eventMs);
      const localDay = isSameLocalUtcDay(eventDate, referenceDate, lonEastDeg);
      if (prevAltAdj < 0 && altAdj > 0 && !rise && localDay) rise = eventDate;
      if (prevAltAdj > 0 && altAdj < 0 && !set && localDay) set = eventDate;
    }
    prevAltAdj = altAdj;

    let haRaw = unwrappedMoonHourAngle(date, lonEastDeg);
    if (prevHaUnwrapped !== null) {
      // Se l'HA "grezzo" salta all'indietro di ~360°, correggi l'offset di srotolamento.
      while (haRaw + haOffset < prevHaUnwrapped - 180) haOffset += 360;
      while (haRaw + haOffset > prevHaUnwrapped + 180) haOffset -= 360;
    }
    const haUnwrapped = haRaw + haOffset;

    if (prevHaUnwrapped !== null) {
      const prevMod = mod(prevHaUnwrapped, 360);
      const curMod = mod(haUnwrapped, 360);
      const crossedZero = prevMod > 180 && curMod <= 180;
      const crossed180 = prevMod <= 180 && curMod > 180;

      if (crossedZero || crossed180) {
        const targetMultiple = Math.round(haUnwrapped / 180) * 180;
        const eventMs = bisect(
          (ms) => unwrappedTargetDelta(new Date(ms), lonEastDeg, targetMultiple, haOffset),
          t - stepMs,
          t
        );
        const eventDate = new Date(eventMs);
        const localDay = isSameLocalUtcDay(eventDate, referenceDate, lonEastDeg);
        if (crossedZero && !transit && localDay) transit = eventDate;
        if (crossed180 && !antitransit && localDay) antitransit = eventDate;
      }
    }
    prevHaUnwrapped = haUnwrapped;
  }

  const { phase, illumination, label } = moonPhaseAt(referenceDate);

  return { rise, set, transit, antitransit, phase, illumination, phaseLabel: label };
}

function unwrappedTargetDelta(
  date: Date,
  lonEastDeg: number,
  targetMultiple: number,
  approxOffset: number
): number {
  const haRaw = unwrappedMoonHourAngle(date, lonEastDeg);
  // Riporta haRaw vicino al target usando l'offset approssimativo del passo di scansione.
  let ha = haRaw + approxOffset;
  while (ha - targetMultiple > 180) ha -= 360;
  while (ha - targetMultiple < -180) ha += 360;
  return ha - targetMultiple;
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/** true se `date` cade nello stesso giorno locale di `reference`, usando la
 * longitudine come proxy grezzo del fuso orario (±12h da UTC in base a lon). */
function isSameLocalUtcDay(date: Date, reference: Date, lonEastDeg: number): boolean {
  const offsetHours = lonEastDeg / 15;
  const shifted = new Date(date.getTime() + offsetHours * 3600000);
  const refShifted = new Date(reference.getTime() + offsetHours * 3600000);
  return (
    shifted.getUTCFullYear() === refShifted.getUTCFullYear() &&
    shifted.getUTCMonth() === refShifted.getUTCMonth() &&
    shifted.getUTCDate() === refShifted.getUTCDate()
  );
}

const PHASE_LABELS = [
  { max: 0.03, label: "Luna Nuova" },
  { max: 0.22, label: "Crescente" },
  { max: 0.28, label: "Primo Quarto" },
  { max: 0.47, label: "Gibbosa Crescente" },
  { max: 0.53, label: "Luna Piena" },
  { max: 0.72, label: "Gibbosa Calante" },
  { max: 0.78, label: "Ultimo Quarto" },
  { max: 0.97, label: "Calante" },
  { max: 1.01, label: "Luna Nuova" },
];

/** Fase lunare (0-1) e illuminazione (0-1) alla data indicata. */
export function moonPhaseAt(date: Date): { phase: number; illumination: number; label: string } {
  const d = daysSinceEpoch(date);
  const sun = sunPosition(d);
  const moon = moonPosition(d);

  // Elongazione geocentrica Sole-Luna (angolo di fase approssimato via longitudini).
  const elongation = norm360(moon.raDeg - sun.raDeg);
  const phase = elongation / 360;
  const phaseAngle = norm180(elongation);
  const illumination = (1 - Math.cos(phaseAngle * DEG)) / 2;

  const entry = PHASE_LABELS.find((p) => phase <= p.max) ?? PHASE_LABELS[PHASE_LABELS.length - 1];

  return { phase, illumination, label: entry.label };
}

export function sunDeclinationDeg(date: Date): number {
  return sunPosition(daysSinceEpoch(date)).decDeg;
}

// Esportate per riuso in /lib/tides.ts (fasi orarie Sole/Luna, senza rifare i calcoli).
export function moonHourAngleDeg(date: Date, lonEastDeg: number): number {
  const d = daysSinceEpoch(date);
  const moon = moonPosition(d);
  const lst = localSiderealTimeDeg(d, utHoursOf(date), lonEastDeg);
  return hourAngleDeg(lst, moon.raDeg);
}

export function sunHourAngleDeg(date: Date, lonEastDeg: number): number {
  const d = daysSinceEpoch(date);
  const sun = sunPosition(d);
  const lst = localSiderealTimeDeg(d, utHoursOf(date), lonEastDeg);
  return hourAngleDeg(lst, sun.raDeg);
}

export function moonDistanceEarthRadii(date: Date): number {
  return moonPosition(daysSinceEpoch(date)).distanceEarthRadii;
}
