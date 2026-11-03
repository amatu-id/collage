// Kolase — photo filters (pixel based, identical on screen and in exports)
export const ADJ = [['b', 'Kecerahan', -100, 100], ['c', 'Kontras', -100, 100], ['s', 'Saturasi', -100, 100], ['w', 'Kehangatan', -100, 100], ['f', 'Pudar', 0, 100], ['v', 'Vinyet', 0, 100], ['sp', 'Sepia', 0, 100]];
const KEYS = ADJ.map(a => a[0]);
export const PRESETS = [
  ['asli', 'Asli', {}],
  ['cerah', 'Cerah', { b: 12, c: 8, s: 10 }],
  ['vivid', 'Vivid', { c: 18, s: 38 }],
  ['hangat', 'Hangat', { w: 38, s: 8 }],
  ['dingin', 'Dingin', { w: -38, c: 5 }],
  ['vintage', 'Vintage', { w: 22, f: 32, s: -22, c: -6, v: 32 }],
  ['pudar', 'Pudar', { f: 46, c: -14, s: -16 }],
  ['lembut', 'Lembut', { b: 9, c: -18, f: 14 }],
  ['dramatis', 'Dramatis', { c: 34, b: -6, s: -14, v: 42 }],
  ['retro', 'Retro', { w: 16, c: 16, s: -12, f: 22, sp: 18 }],
  ['bw', 'Hitam Putih', { s: -100 }],
  ['noir', 'Noir', { s: -100, c: 42, v: 38 }],
  ['sepia', 'Sepia', { sp: 85, c: 6 }]
];
const PMAP = Object.fromEntries(PRESETS.map(p => [p[0], p[2]]));

export function effective(f) {
  if (!f) return null;
  const p = PMAP[f.p] || {}, o = {};
  for (const k of KEYS) o[k] = (p[k] || 0) + (f[k] || 0);
  return o;
}
export const isIdentity = e => !e || KEYS.every(k => !e[k]);

export function applyFilter(ctx, w, h, e) {
  if (isIdentity(e) || w < 1 || h < 1) return;
  const id = ctx.getImageData(0, 0, w, h), d = id.data;
  const cc = e.c * 1.275, cf = (259 * (cc + 255)) / (255 * (259 - cc));
  const fa = e.f / 100, warm = e.w * .32;
  const L = [new Uint8ClampedArray(256), new Uint8ClampedArray(256), new Uint8ClampedArray(256)];
  for (let v = 0; v < 256; v++) {
    let x = v * (1 + e.b / 160) + e.b * .35;
    x = (x - 128) * cf + 128;
    x = x * (1 - .22 * fa) + 38 * fa;
    L[0][v] = x + warm; L[1][v] = x + warm * .12; L[2][v] = x - warm;
  }
  const sat = 1 + e.s / 100, sp = e.sp / 100, vig = e.v / 100, cx = w / 2, cy = h / 2;
  for (let y = 0, i = 0; y < h; y++) {
    const dy = (y - cy) / cy;
    for (let x = 0; x < w; x++, i += 4) {
      let r = L[0][d[i]], g = L[1][d[i + 1]], b = L[2][d[i + 2]];
      if (sat !== 1) { const l = .299 * r + .587 * g + .114 * b; r = l + (r - l) * sat; g = l + (g - l) * sat; b = l + (b - l) * sat; }
      if (sp) {
        const sr = .393 * r + .769 * g + .189 * b, sg = .349 * r + .686 * g + .168 * b, sb = .272 * r + .534 * g + .131 * b;
        r += (sr - r) * sp; g += (sg - g) * sp; b += (sb - b) * sp;
      }
      if (vig) { const dx = (x - cx) / cx, q = Math.min(1, (dx * dx + dy * dy) / 2 * 1.2), m = 1 - vig * .82 * q * q; r *= m; g *= m; b *= m; }
      d[i] = r; d[i + 1] = g; d[i + 2] = b;
    }
  }
  ctx.putImageData(id, 0, 0);
}
