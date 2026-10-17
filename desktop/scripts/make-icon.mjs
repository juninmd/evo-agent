// Gera o PNG quadrado de origem do icone (1024x1024, RGBA) sem dependencia
// externa: `npx tauri icon scripts/icon.png` deriva dali todos os tamanhos.
//
// O desenho e uma linha de tendencia ascendente sobre um quadrado escuro: e a
// leitura do painel (metricas de saude do agente) e nao precisa de fonte.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SIZE = 1024;
const OUT = join(dirname(fileURLToPath(import.meta.url)), "icon.png");

const BG_TOP = [17, 24, 38];
const BG_BOTTOM = [10, 15, 23];
const ACCENT = [74, 222, 128];
const ACCENT_SOFT = [167, 243, 208];

const pixels = Buffer.alloc(SIZE * SIZE * 4);

const clamp01 = (value) => Math.min(1, Math.max(0, value));
/** Cobertura a partir de uma distancia com sinal, em pixels. */
const coverage = (distance) => clamp01(0.5 - distance);

function blend(x, y, color, alpha) {
  if (alpha <= 0 || x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
  const index = (y * SIZE + x) * 4;
  const previous = pixels[index + 3] / 255;
  const next = alpha + previous * (1 - alpha);
  if (next <= 0) return;
  for (let channel = 0; channel < 3; channel++) {
    const under = pixels[index + channel];
    pixels[index + channel] = Math.round(
      (color[channel] * alpha + under * previous * (1 - alpha)) / next,
    );
  }
  pixels[index + 3] = Math.round(next * 255);
}

/** Distancia de um ponto ao retangulo arredondado; negativa dentro. */
function roundedRectDistance(x, y, left, top, right, bottom, radius) {
  const cx = Math.max(left + radius, Math.min(x, right - radius));
  const cy = Math.max(top + radius, Math.min(y, bottom - radius));
  const dx = x - cx;
  const dy = y - cy;
  const corner = Math.hypot(dx, dy);
  const insideX = Math.max(left - x, x - right);
  const insideY = Math.max(top - y, y - bottom);
  const inside = Math.max(insideX, insideY);
  if (corner > 0) return corner - radius;
  return inside;
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const lengthSquared = vx * vx + vy * vy;
  const t = lengthSquared === 0
    ? 0
    : clamp01(((px - ax) * vx + (py - ay) * vy) / lengthSquared);
  return Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
}

function paintBackground() {
  for (let y = 0; y < SIZE; y++) {
    const mix = y / (SIZE - 1);
    const color = BG_TOP.map((channel, index) =>
      Math.round(channel + (BG_BOTTOM[index] - channel) * mix),
    );
    for (let x = 0; x < SIZE; x++) {
      const distance = roundedRectDistance(x, y, 32, 32, SIZE - 32, SIZE - 32, 208);
      blend(x, y, color, coverage(distance));
    }
  }
}

function paintPolyline(points, width, color) {
  const half = width / 2;
  const minX = Math.min(...points.map((p) => p[0])) - half - 2;
  const maxX = Math.max(...points.map((p) => p[0])) + half + 2;
  const minY = Math.min(...points.map((p) => p[1])) - half - 2;
  const maxY = Math.max(...points.map((p) => p[1])) + half + 2;

  for (let y = Math.max(0, Math.floor(minY)); y <= Math.min(SIZE - 1, Math.ceil(maxY)); y++) {
    for (let x = Math.max(0, Math.floor(minX)); x <= Math.min(SIZE - 1, Math.ceil(maxX)); x++) {
      let nearest = Number.POSITIVE_INFINITY;
      for (let i = 1; i < points.length; i++) {
        nearest = Math.min(
          nearest,
          distanceToSegment(x, y, ...points[i - 1], ...points[i]),
        );
      }
      blend(x, y, color, coverage(nearest - half));
    }
  }
}

function paintDisc(cx, cy, radius, color) {
  for (let y = Math.floor(cy - radius - 2); y <= Math.ceil(cy + radius + 2); y++) {
    for (let x = Math.floor(cx - radius - 2); x <= Math.ceil(cx + radius + 2); x++) {
      blend(x, y, color, coverage(Math.hypot(x - cx, y - cy) - radius));
    }
  }
}

paintBackground();
// Tres barras de feed no terco superior e a tendencia sobre elas.
paintPolyline([[220, 660], [400, 500], [560, 590], [800, 330]], 74, ACCENT);
paintDisc(800, 330, 58, ACCENT_SOFT);

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

const header = Buffer.alloc(13);
header.writeUInt32BE(SIZE, 0);
header.writeUInt32BE(SIZE, 4);
header[8] = 8;
header[9] = 6;
header[10] = 0;
header[11] = 0;
header[12] = 0;

const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0;
  pixels.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", header),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, png);
console.log(`escrito ${OUT} (${png.length} bytes)`);
