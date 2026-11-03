// Kolase — geometry + canvas rendering shared by the editor and the exporter
import { shapePath, dims } from './model.js';
import { effective, applyFilter } from './filters.js';

// cell rectangle in page pixels (k = px per mm); gaps only on edges shared with other cells
export function cellBox(c, st, W, H, k) {
  const m = st.margin * k, g = st.gap * k / 2, cw = W - 2 * m, ch = H - 2 * m, e = 1e-3;
  let x0 = m + c.x * cw, y0 = m + c.y * ch, x1 = m + (c.x + c.w) * cw, y1 = m + (c.y + c.h) * ch;
  if (c.x > e) x0 += g; if (c.x + c.w < 1 - e) x1 -= g; if (c.y > e) y0 += g; if (c.y + c.h < 1 - e) y1 -= g;
  return { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) };
}

// how the photo sits in a w×h cell: scale + free overflow (for panning)
export function photoGeom(iw0, ih0, c, w, h) {
  const r90 = ((c.rot || 0) / 90) & 1, iw = r90 ? ih0 : iw0, ih = r90 ? iw0 : ih0;
  const th = (c.ang || 0) * Math.PI / 180, cs = Math.abs(Math.cos(th)), sn = Math.abs(Math.sin(th));
  const Wc = w * cs + h * sn, Hc = w * sn + h * cs;
  const s = Math.max(Wc / iw, Hc / ih) * (c.z || 1);
  return { s, th, ox: iw * s - Wc, oy: ih * s - Hc };
}
export function drawPhoto(ctx, img, c, w, h) {
  const g = photoGeom(img.width, img.height, c, w, h);
  const cx = (.5 - (c.fx ?? .5)) * g.ox, cy = (.5 - (c.fy ?? .5)) * g.oy;
  ctx.save();
  ctx.translate(w / 2, h / 2); ctx.rotate(g.th); ctx.translate(cx, cy);
  ctx.rotate((c.rot || 0) * Math.PI / 180); if (c.flip) ctx.scale(-1, 1);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, -img.width * g.s / 2, -img.height * g.s / 2, img.width * g.s, img.height * g.s);
  ctx.restore();
}
// photo + filter, rectangle w×h
export function cellImage(img, c, w, h) {
  w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const x = cv.getContext('2d', { willReadFrequently: true });
  drawPhoto(x, img, c, w, h);
  applyFilter(x, w, h, effective(c.flt));
  return cv;
}

export function fillBg(ctx, bg, W, H) {
  if (!bg || bg.t === 'none') return;
  if (bg.t === 'grad') {
    const a = (bg.ang - 90) * Math.PI / 180, L = Math.abs(W * Math.cos(a)) + Math.abs(H * Math.sin(a));
    const dx = Math.cos(a) * L / 2, dy = Math.sin(a) * L / 2;
    const gr = ctx.createLinearGradient(W / 2 - dx, H / 2 - dy, W / 2 + dx, H / 2 + dy);
    gr.addColorStop(0, bg.a); gr.addColorStop(1, bg.b); ctx.fillStyle = gr;
  } else ctx.fillStyle = bg.c;
  ctx.fillRect(0, 0, W, H);
}

// draws one placed cell (shape clip, shadow, border) with ctx already at the cell origin
export function paintCell(ctx, src, st, w, h, k, withShadow) {
  const sh = st.shape || 'rect', r = st.radius * k;
  if (withShadow && st.shadow > 0) {
    ctx.save(); shapePath(ctx, sh, w, h, r);
    ctx.shadowColor = 'rgba(0,0,0,.38)'; ctx.shadowBlur = st.shadow * k * 1.2; ctx.shadowOffsetY = st.shadow * k * .35;
    ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
  }
  ctx.save(); shapePath(ctx, sh, w, h, r); ctx.clip();
  if (src) ctx.drawImage(src, 0, 0, w, h);
  if (st.border > 0) { ctx.lineWidth = st.border * k * 2; ctx.strokeStyle = st.borderColor; shapePath(ctx, sh, w, h, r); ctx.stroke(); }
  ctx.restore();
}

export function textFont(t, px) { return (t.ital ? 'italic ' : '') + (t.bold ? '700 ' : '400 ') + px + 'px "' + t.font + '", sans-serif'; }
export function drawText(ctx, t, W, H, k) {
  const fs = t.size * k, lh = fs * 1.2, lines = String(t.txt || '').split('\n');
  ctx.save(); ctx.font = textFont(t, fs); ctx.textBaseline = 'middle';
  const bw = Math.max(...lines.map(l => ctx.measureText(l).width), 1), bh = lines.length * lh;
  const cx = t.x * W, cy = t.y * H, pad = t.bg ? fs * .35 : 0;
  if (t.bg) {
    ctx.fillStyle = t.bg; ctx.beginPath();
    const x = cx - bw / 2 - pad, y = cy - bh / 2 - pad, w = bw + pad * 2, h = bh + pad * 2, r = pad;
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.fill();
  }
  if (t.shadow) { ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = fs * .22; ctx.shadowOffsetY = fs * .05; }
  ctx.fillStyle = t.color; ctx.textAlign = t.align || 'center';
  const ax = t.align === 'left' ? cx - bw / 2 : t.align === 'right' ? cx + bw / 2 : cx;
  lines.forEach((l, i) => ctx.fillText(l, ax, cy - bh / 2 + lh * (i + .5)));
  ctx.restore();
}

// full-resolution page → canvas. getImg(id) resolves to an ImageBitmap/canvas (or null)
export async function renderPage(P, page, k, getImg, opt = {}) {
  const d = dims(P), W = Math.round(d.w * k), H = Math.round(d.h * k);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  if (opt.opaque || P.style.bg.t !== 'none') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); }
  fillBg(ctx, P.style.bg, W, H);
  for (const c of page.cells) {
    if (!c.ph) continue;
    const img = await getImg(c.ph); if (!img) continue;
    const b = cellBox(c, P.style, W, H, k);
    const src = cellImage(img, c, b.w, b.h);
    ctx.save(); ctx.translate(b.x, b.y); paintCell(ctx, src, P.style, b.w, b.h, k, true); ctx.restore();
  }
  for (const t of page.texts || []) drawText(ctx, t, W, H, k);
  return cv;
}
