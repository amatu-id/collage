// Kolase — automatic page layout: many photos → pages that are completely filled (no empty space).
// Every layout is a guillotine partition of the content box, so the photos always cover it edge to edge;
// the search only decides how to split so each cell is as close as possible to its photo's aspect (least crop).

function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

// crop lost by "cover" fitting + penalty for uneven sizes and very thin cells
export function score(rects, as) {
  let A = 0, crop = 0, thin = 0;
  const la = [];
  rects.forEach((r, i) => {
    const ar = r.w / r.h, pa = as[i], q = Math.min(ar / pa, pa / ar), area = r.w * r.h;
    A += area; crop += area * (1 - q); la.push(Math.log(area));
    if (ar > 3.6 || ar < 1 / 3.6) thin++;
  });
  const m = la.reduce((s, v) => s + v, 0) / la.length;
  const sd = Math.sqrt(la.reduce((s, v) => s + (v - m) ** 2, 0) / la.length);
  return crop / A + 0.07 * sd + 0.35 * thin / rects.length;
}

// rows of photos in their given order; each row justified to the width, rows stretched to fill the height
function rowsLayout(a, W, H, g) {
  const n = a.length, maxK = Math.min(n, 8);
  let best = null;
  for (let R = 1; R <= n; R++) {
    if (Math.ceil(n / R) > maxK) continue;
    const th = (H - (R - 1) * g) / R;
    const rowH = (i, j) => { let S = 0; for (let t = i; t < j; t++) S += a[t]; return (W - (j - i - 1) * g) / S; };
    const dp = Array.from({ length: n + 1 }, () => new Array(R + 1).fill(Infinity)), bk = Array.from({ length: n + 1 }, () => new Array(R + 1).fill(-1));
    dp[0][0] = 0;
    for (let r = 1; r <= R; r++) for (let j = r; j <= n; j++) for (let i = Math.max(r - 1, j - maxK); i < j; i++) {
      if (dp[i][r - 1] === Infinity) continue;
      const c = dp[i][r - 1] + Math.log(rowH(i, j) / th) ** 2;
      if (c < dp[j][r]) { dp[j][r] = c; bk[j][r] = i; }
    }
    if (dp[n][R] === Infinity) continue;
    const cuts = []; let j = n;
    for (let r = R; r > 0; r--) { const i = bk[j][r]; cuts.unshift([i, j]); j = i; }
    const hs = cuts.map(([i, j]) => rowH(i, j)), sum = hs.reduce((s, v) => s + v, 0), f = (H - (R - 1) * g) / sum;
    const rects = []; let y = 0;
    cuts.forEach(([i, j], r) => {
      const h = hs[r] * f; let x = 0;
      const S = a.slice(i, j).reduce((s, v) => s + v, 0), Wr = W - (j - i - 1) * g;
      for (let t = i; t < j; t++) { const w = Wr * a[t] / S; rects.push({ x, y, w, h }); x += w + g; }
      y += h + g;
    });
    const sc = score(rects, a);
    if (!best || sc < best.sc) best = { rects, sc, order: a.map((_, i) => i), rot: a.map(() => 0) };
  }
  return best;
}

// uniform rows: same cell size inside a row, rows of equal height
function gridLayout(a, W, H, g) {
  const n = a.length; let best = null;
  for (let R = 1; R <= n; R++) {
    const base = Math.floor(n / R), extra = n % R; if (!base) break;
    const rects = []; const h = (H - (R - 1) * g) / R;
    for (let r = 0; r < R; r++) {
      const k = base + (r < extra ? 1 : 0), w = (W - (k - 1) * g) / k;
      for (let c = 0; c < k; c++) rects.push({ x: c * (w + g), y: r * (h + g), w, h });
    }
    const sc = score(rects, a);
    if (!best || sc < best.sc) best = { rects, sc, order: a.map((_, i) => i), rot: a.map(() => 0) };
  }
  return best;
}

// free mosaic: random slicing trees + hill climbing (optionally reorders / rotates photos)
function mosaicLayout(a, W, H, g, smart, allowRot, rnd) {
  const n = a.length;
  const rand = (lo, hi) => {
    if (hi - lo === 1) return { l: lo };
    const k = lo + 1 + Math.floor(rnd() * (hi - lo - 1));
    return { t: rnd() < .5 ? 'h' : 'v', a: rand(lo, k), b: rand(k, hi) };
  };
  const evalT = st => {
    const as = st.perm.map(p => st.rot[p] ? 1 / a[p] : a[p]);
    const asp = nd => nd.l !== undefined ? (nd.A = as[nd.l]) : (nd.t === 'h' ? (nd.A = asp(nd.a) + asp(nd.b)) : (nd.A = 1 / (1 / asp(nd.a) + 1 / asp(nd.b))));
    asp(st.tree);
    const rects = new Array(n);
    const place = (nd, x, y, w, h) => {
      if (nd.l !== undefined) { rects[nd.l] = { x, y, w, h }; return; }
      if (nd.t === 'h') { const wa = Math.max(1e-3, (w - g) * nd.a.A / (nd.a.A + nd.b.A)); place(nd.a, x, y, wa, h); place(nd.b, x + wa + g, y, w - wa - g, h); }
      else { const ia = 1 / nd.a.A, ib = 1 / nd.b.A, ha = Math.max(1e-3, (h - g) * ia / (ia + ib)); place(nd.a, x, y, w, ha); place(nd.b, x, y + ha + g, w, h - ha - g); }
    };
    place(st.tree, 0, 0, W, H);
    if (rects.some(r => r.w <= 0 || r.h <= 0)) return { rects, sc: Infinity };
    return { rects, sc: score(rects, as) };
  };
  const clone = t => t.l !== undefined ? { l: t.l } : { t: t.t, a: clone(t.a), b: clone(t.b) };
  const internals = (t, out = []) => { if (t.l === undefined) { out.push(t); internals(t.a, out); internals(t.b, out); } return out; };
  const range = t => { const ls = []; const walk = x => x.l !== undefined ? ls.push(x.l) : (walk(x.a), walk(x.b)); walk(t); return [Math.min(...ls), Math.max(...ls) + 1]; };
  let best = null;
  const start = { perm: a.map((_, i) => i), rot: a.map(() => 0) };
  if (smart) start.perm.sort((i, j) => a[j] - a[i]);
  const tries = Math.max(60, 500 - n * 10);
  for (let t = 0; t < tries; t++) {
    const st = { tree: rand(0, n), perm: start.perm.slice(), rot: start.rot.slice() };
    if (smart && t % 2) for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [st.perm[i], st.perm[j]] = [st.perm[j], st.perm[i]]; }
    const r = evalT(st); if (!best || r.sc < best.sc) best = Object.assign(st, r);
  }
  if (n > 1) for (let it = 0; it < 1500; it++) {
    const st = { tree: clone(best.tree), perm: best.perm.slice(), rot: best.rot.slice() };
    const m = rnd(), ins = internals(st.tree), nd = ins[Math.floor(rnd() * ins.length)];
    if (m < .4) nd.t = nd.t === 'h' ? 'v' : 'h';
    else if (m < .62) { const [lo, hi] = range(nd); Object.assign(nd, rand(lo, hi)); if (nd.l !== undefined) { delete nd.t; delete nd.a; delete nd.b; } }
    else if (m < .7) { const x = nd.a; nd.a = nd.b; nd.b = x; const [lo, hi] = range(st.tree); const relabel = (q, c) => { if (q.l !== undefined) { q.l = c.i++; return; } relabel(q.a, c); relabel(q.b, c); }; relabel(st.tree, { i: lo }); void hi; }
    else if (smart && m < .9) { const i = Math.floor(rnd() * n), j = Math.floor(rnd() * n); [st.perm[i], st.perm[j]] = [st.perm[j], st.perm[i]]; }
    else if (allowRot) { const i = Math.floor(rnd() * n); st.rot[i] ^= 1; }
    else nd.t = nd.t === 'h' ? 'v' : 'h';
    const r = evalT(st); if (r.sc < best.sc) best = Object.assign(st, r);
  }
  // rects are indexed by leaf position; perm maps position → photo
  return { rects: best.rects, sc: best.sc, order: best.perm, rot: best.perm.map(p => best.rot[p]) };
}

function toCell(r, W, H, g) {
  const e = 0.01; let x0 = r.x, y0 = r.y, x1 = r.x + r.w, y1 = r.y + r.h;
  if (x0 > e) x0 -= g / 2; if (x1 < W - e) x1 += g / 2; if (y0 > e) y0 -= g / 2; if (y1 < H - e) y1 += g / 2;
  return { x: x0 / W, y: y0 / H, w: (x1 - x0) / W, h: (y1 - y0) / H };
}

export function layoutPage(photos, o, rnd = rng(o.seed || 1)) {
  const a = photos.map(p => p.a), { W, H, gap: g } = o;
  const c = [];
  if (o.mode === 'rows' || o.mode === 'auto') { const r = rowsLayout(a, W, H, g); if (r) { r.kind = 'rows'; c.push(r); } }
  if (o.mode === 'grid') { const r = gridLayout(a, W, H, g); if (r) { r.kind = 'grid'; c.push(r); } }
  if (o.mode === 'mosaic' || o.mode === 'auto') { const r = mosaicLayout(a, W, H, g, o.smart, o.rotate, rnd); r.kind = 'mosaic'; c.push(r); }
  // rows look tidier: prefer them unless the mosaic crops clearly less (a new seed tips the balance)
  c.forEach(r => { r.adj = r.sc * (r.kind === 'rows' ? ((o.seed || 1) > 1 ? 1.3 : .93) : 1); });
  c.sort((x, y) => x.adj - y.adj);
  const b = c[0];
  return {
    kind: b.kind, sc: b.sc,
    cells: b.rects.map((r, i) => Object.assign(toCell(r, W, H, g), { ph: photos[b.order[i]].id, rot: b.rot[i] ? 90 : 0 }))
  };
}

export function autoPer(N) { return N <= 6 ? N : 6; }

// photos: [{id, a}] → [{cells:[{x,y,w,h,ph,rot}]}]
export function autoArrange(photos, o) {
  const N = photos.length; if (!N) return [];
  const per = Math.max(1, o.per === 'auto' ? autoPer(N) : +o.per);
  const P = Math.ceil(N / per), base = Math.floor(N / P), extra = N % P;
  const rnd = rng(o.seed || 1), pages = []; let k = 0;
  for (let p = 0; p < P; p++) {
    const n = base + (p < extra ? 1 : 0);
    pages.push(layoutPage(photos.slice(k, k + n), o, rnd)); k += n;
  }
  return pages;
}
