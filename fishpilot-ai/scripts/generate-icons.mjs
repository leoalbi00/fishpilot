// Genera le icone PWA (ancora stilizzata su sfondo brand) come PNG puri,
// senza dipendenze native (niente sharp/canvas): rasterizza un glifo
// disegnato via signed-distance-function e comprime con zlib (built-in
// Node). Eseguito una tantum con `node scripts/generate-icons.mjs`, i
// risultati sono committati in public/icons e src/app/icon.png.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Palette brand (vedi src/app/globals.css)
const ABYSS = [6, 22, 32];
const DEPTH = [14, 42, 61];
const SIGNAL = [255, 178, 56];
const TIDE = [45, 212, 191];

function lerp(a, b, t) {
  return a + (b - a) * t;
}
function lerpColor(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

function sdCapsule(px, py, ax, ay, bx, by, r) {
  const pax = px - ax;
  const pay = py - ay;
  const bax = bx - ax;
  const bay = by - ay;
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / (bax * bax + bay * bay)));
  const dx = pax - bax * h;
  const dy = pay - bay * h;
  return Math.sqrt(dx * dx + dy * dy) - r;
}

function sdRing(px, py, cx, cy, r, thickness) {
  return Math.abs(Math.hypot(px - cx, py - cy) - r) - thickness / 2;
}

/** Distanza (con segno approssimato, solo per AA) dal glifo ancora. */
function anchorDist(px, py, n) {
  const cx = n / 2;
  const ringCy = n * 0.28;
  const ringR = n * 0.09;
  const ringThickness = n * 0.045;
  const shaftHalfWidth = n * 0.035;
  const shaftTopY = ringCy + ringR * 0.55;
  const shaftBottomY = n * 0.78;
  const crossbarY = ringCy + ringR * 1.05;
  const crossbarHalf = n * 0.16;

  const dRing = sdRing(px, py, cx, ringCy, ringR, ringThickness);
  const dShaft = sdCapsule(px, py, cx, shaftTopY, cx, shaftBottomY, shaftHalfWidth);
  const dCross = sdCapsule(
    px,
    py,
    cx - crossbarHalf,
    crossbarY,
    cx + crossbarHalf,
    crossbarY,
    shaftHalfWidth * 0.85
  );
  const dFlukeL = sdCapsule(
    px,
    py,
    cx,
    shaftBottomY,
    cx - n * 0.19,
    shaftBottomY - n * 0.12,
    shaftHalfWidth * 0.9
  );
  const dFlukeR = sdCapsule(
    px,
    py,
    cx,
    shaftBottomY,
    cx + n * 0.19,
    shaftBottomY - n * 0.12,
    shaftHalfWidth * 0.9
  );
  const dTipL = Math.hypot(px - (cx - n * 0.19), py - (shaftBottomY - n * 0.12)) - shaftHalfWidth * 1.05;
  const dTipR = Math.hypot(px - (cx + n * 0.19), py - (shaftBottomY - n * 0.12)) - shaftHalfWidth * 1.05;

  return Math.min(dRing, dShaft, dCross, dFlukeL, dFlukeR, dTipL, dTipR);
}

function renderAnchorIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const aa = Math.max(1, size * 0.006);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = y / size;
      const bg = lerpColor(ABYSS, DEPTH, t);

      const dGlyph = anchorDist(x + 0.5, y + 0.5, size);
      const coverage = Math.max(0, Math.min(1, 0.5 - dGlyph / aa));

      // Leggero bagliore "tide" dietro il glifo per profondità visiva.
      const glowDist = Math.max(0, dGlyph);
      const glow = Math.max(0, 1 - glowDist / (size * 0.14)) * 0.18;

      const withGlow = lerpColor(bg, TIDE, glow);
      const final = lerpColor(withGlow, SIGNAL, coverage);

      const idx = (y * size + x) * 4;
      buf[idx] = Math.round(final[0]);
      buf[idx + 1] = Math.round(final[1]);
      buf[idx + 2] = Math.round(final[2]);
      buf[idx + 3] = 255;
    }
  }

  return buf;
}

// ---- Encoder PNG minimale (IHDR/IDAT/IEND, RGBA 8bit, filtro "none") ----

const CRC_TABLE = (() => {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(rgba, width, height) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filtro: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = deflateSync(raw, { level: 9 });
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function writeIcon(path, size) {
  const rgba = renderAnchorIcon(size);
  const png = encodePNG(rgba, size, size);
  writeFileSync(path, png);
  console.log(`✓ ${path} (${size}x${size}, ${(png.length / 1024).toFixed(1)} KB)`);
}

const iconsDir = join(root, "public", "icons");
mkdirSync(iconsDir, { recursive: true });

writeIcon(join(iconsDir, "icon-192.png"), 192);
writeIcon(join(iconsDir, "icon-512.png"), 512);
writeIcon(join(iconsDir, "icon-maskable-512.png"), 512);
writeIcon(join(iconsDir, "apple-touch-icon.png"), 180);
writeIcon(join(root, "src", "app", "icon.png"), 64);
