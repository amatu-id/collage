// Kolase — editor UI
import { uid, clamp, PAPERS, paperById, dims, TEMPLATES, tplById, SHAPES, shapePath, BGS, bgCss, FONTS, EMOJI, newCell, newPage, newProject } from './model.js';
import { autoArrange, layoutPage, autoPer } from './auto.js';
import { PRESETS, ADJ, effective, applyFilter } from './filters.js';
import { cellBox, photoGeom, cellImage, paintCell, renderPage, textFont, drawPhoto } from './render.js';
import { getAll, get, put, del, importFile } from './store.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const isMob = () => innerWidth <= 760;
const coarse = matchMedia('(pointer: coarse)').matches;

const ICONS = {
  back: '<path d="m15 18-6-6 6-6"/>', undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>', redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
  minus: '<path d="M5 12h14"/>', plus: '<path d="M12 5v14M5 12h14"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  print: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>', share: '<path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13"/>',
  layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M11 3v18M11 12h10"/>',
  images: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  filt: '<circle cx="12" cy="8.5" r="5.5"/><circle cx="8.5" cy="15" r="5.5"/><circle cx="15.5" cy="15" r="5.5"/>',
  type: '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>', file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  upload: '<path d="M12 15V3M7 8l5-5 5 5M5 21h14"/>', paste: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
  imgplus: '<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/><path d="M16 5h6M19 2v6"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  rotate: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>', flip: '<path d="M12 3v18"/><path d="M8 7 3 12l5 5zM16 7l5 5-5 5z"/>',
  center: '<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>', trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  imgx: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 9 6 6M15 9l-6 6"/>',
  splitH: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/>', splitV: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 12h18"/>',
  up: '<path d="m18 15-6-6-6 6"/>', down: '<path d="m6 9 6 6 6-6"/>', copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>', more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  auto: '<path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/><path d="M19 15l.8 1.7 1.7.8-1.7.8L19 20l-.8-1.7-1.7-.8 1.7-.8z"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>', check: '<path d="M20 6 9 17l-5-5"/>',
  alignL: '<path d="M3 6h18M3 12h12M3 18h16"/>', alignC: '<path d="M3 6h18M6 12h12M4 18h16"/>', alignR: '<path d="M3 6h18M9 12h12M5 18h16"/>',
  shuffle: '<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>'
};
const ic = n => '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[n] || '') + '</svg>';
const SHAPE_IC = {
  rect: '<rect x="4" y="4" width="16" height="16" rx="1.5"/>', oval: '<ellipse cx="12" cy="12" rx="7" ry="9.5"/>', circle: '<circle cx="12" cy="12" r="8.5"/>',
  arch: '<path d="M5 21V11a7 7 0 0 1 14 0v10z"/>', heart: '<path d="M12 20.5C5 15.5 3 12.5 3 9a4.5 4.5 0 0 1 9-1 4.5 4.5 0 0 1 9 1c0 3.5-2 6.5-9 11.5z"/>',
  hex: '<path d="M7.5 3.5h9L21 12l-4.5 8.5h-9L3 12z"/>', diamond: '<path d="M12 2.5 21.5 12 12 21.5 2.5 12z"/>',
  star: '<path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/>'
};

// ---------- state ----------
let P = null, sel = null, cur = 0, tab = 'layout', layFilter = 'all';
const view = { zoom: 1, k: 1 };
const H = { u: [], r: [], lk: null, lt: 0 };
const recs = new Map(), prevs = new Map(), prevP = new Map(), urls = new Map();
const pagesEl = $('#pages'), stage = $('#stage');

// ---------- small ui helpers ----------
let toastT;
function toast(msg, act, ms = 3200) {
  const t = $('#toast');
  t.innerHTML = '<span>' + esc(msg) + '</span>' + (act ? '<button>' + esc(act.label) + '</button>' : '');
  if (act) t.querySelector('button').onclick = () => { t.classList.remove('on'); act.fn(); };
  t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), act ? ms + 2500 : ms);
}
function busy(text) { $('#busy').hidden = !text; if (text) $('#busyT').textContent = text; }
const tick = () => new Promise(r => setTimeout(r, 0));
function modal(html) {
  const m = $('#modal');
  if (!html) { m.hidden = true; m.innerHTML = ''; return null; }
  m.innerHTML = html; m.hidden = false;
  m.onclick = e => { if (e.target === m) modal(); };
  return m.firstElementChild;
}
function menu(x, y, items) {
  document.querySelectorAll('.menu').forEach(m => m.remove());
  const m = document.createElement('div'); m.className = 'menu';
  m.innerHTML = items.map((it, i) => '<button data-i="' + i + '" class="' + (it.danger ? 'danger' : '') + '">' + ic(it.ic) + esc(it.t) + '</button>').join('');
  document.body.append(m);
  m.style.left = clamp(x, 8, innerWidth - m.offsetWidth - 8) + 'px'; m.style.top = clamp(y, 8, innerHeight - m.offsetHeight - 8) + 'px';
  m.onclick = e => { const b = e.target.closest('button'); if (!b) return; m.remove(); items[+b.dataset.i].fn(); };
  setTimeout(() => document.addEventListener('pointerdown', function h(e) { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('pointerdown', h, true); } }, true));
}
function download(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 20000);
}
const scripts = {};
function loadScript(src) {
  return scripts[src] || (scripts[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => { delete scripts[src]; rej(new Error('Gagal memuat ' + src)); }; document.head.append(s); }));
}
const safeName = s => (s || 'kolase').replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 80) || 'kolase';
function paperLabel(p = P) {
  const d = dims(p), pp = paperById(p.paper.id);
  const n = pp ? pp.n : 'Kustom';
  return n + ' ' + (d.w > d.h ? 'mendatar' : d.w < d.h ? 'tegak' : '') + (d.px ? ' · ' + d.px[0] + '×' + d.px[1] + ' px' : ' · ' + +d.w.toFixed(1) + '×' + +d.h.toFixed(1) + ' mm');
}

// ---------- theme ----------
function applyTheme(t) {
  if (!t) { try { t = localStorage.getItem('collage.theme'); } catch (e) { } }
  if (!t) t = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  document.documentElement.dataset.theme = t;
  $('#gTheme').innerHTML = $('#bTheme').innerHTML = ic(t === 'light' ? 'moon' : 'sun');
  document.querySelector('meta[name=theme-color]').content = t === 'light' ? '#ffffff' : '#16161a';
}
function toggleTheme() {
  const t = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  try { localStorage.setItem('collage.theme', t); } catch (e) { }
  applyTheme(t);
}

// ---------- photos ----------
function ensurePrev(id) {
  if (prevs.has(id)) return Promise.resolve(prevs.get(id));
  if (prevP.has(id)) return prevP.get(id);
  const p = (async () => {
    let r = recs.get(id);
    if (!r) { r = await get('photos', id); if (!r) return null; recs.set(id, r); }
    try {
      const b = await createImageBitmap(r.prev || r.blob);
      prevs.set(id, b);
      if (!urls.has(id)) urls.set(id, URL.createObjectURL(r.prev || r.blob));
      return b;
    } catch (e) { return null; }
  })();
  prevP.set(id, p); p.finally(() => prevP.delete(id));
  return p;
}
async function loadRecs(ids) {
  await Promise.all(ids.map(async id => {
    if (recs.has(id)) return;
    const r = await get('photos', id);
    if (r) { recs.set(id, r); if (!urls.has(id)) urls.set(id, URL.createObjectURL(r.prev || r.blob)); }
  }));
}
const IMG_RE = /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif|tiff?)$/i;
async function importFiles(files) {
  files = [...files].filter(f => f && (/^image\//.test(f.type) || IMG_RE.test(f.name || '')));
  if (!files.length) { toast('Tidak ada file gambar yang bisa dipakai'); return []; }
  const ids = []; let fail = 0;
  for (let i = 0; i < files.length; i++) {
    busy(files.length > 1 ? 'Memproses foto ' + (i + 1) + ' dari ' + files.length + '…' : 'Memproses foto…');
    try {
      const id = uid(), { rec, prevCanvas } = await importFile(files[i], id);
      recs.set(id, rec); prevs.set(id, prevCanvas); urls.set(id, URL.createObjectURL(rec.prev));
      ids.push(id);
    } catch (e) { console.warn(e); fail++; }
    if (i % 3 === 2) await tick();
  }
  busy(false);
  if (fail) toast(fail + ' file tidak dapat dibaca' + (/HEIC/i.test(files.map(f => f.name).join()) ? ' (HEIC hanya didukung Safari)' : ''));
  return ids;
}
const used = () => { const m = new Map(); P.pages.forEach(p => p.cells.forEach(c => c.ph && m.set(c.ph, (m.get(c.ph) || 0) + 1))); return m; };
function empties(startPi = cur, startCi = -1) {
  const out = [];
  const order = [startPi, ...P.pages.map((_, i) => i).filter(i => i !== startPi)];
  for (const pi of order) {
    const cs = P.pages[pi]?.cells || [];
    const idx = cs.map((_, i) => i);
    const ord = pi === startPi && startCi >= 0 ? [...idx.slice(startCi), ...idx.slice(0, startCi)] : idx;
    for (const ci of ord) if (!cs[ci].ph) out.push({ pi, ci });
  }
  return out;
}
function setPhoto(pi, ci, id) {
  const c = P.pages[pi].cells[ci];
  Object.assign(c, { ph: id, fx: .5, fy: .5, z: 1, rot: 0, ang: 0, flip: false });
}

// target: {pi, ci} | {pi} | 'pool' | 'fill' | 'auto'
async function addFiles(files, target) {
  if (!P) return;
  const ids = await importFiles(files);
  if (!ids.length) return;
  mark();
  P.pool.push(...ids);
  if (target === 'auto') { autoAll(false); return; }
  let rest = ids.slice(), placed = 0;
  if (target && typeof target === 'object') {
    const slots = [];
    if (target.ci != null) slots.push({ pi: target.pi, ci: target.ci });
    for (const s of empties(target.pi, target.ci ?? -1)) if (!(s.pi === target.pi && s.ci === target.ci)) slots.push(s);
    for (const s of slots) { if (!rest.length) break; setPhoto(s.pi, s.ci, rest.shift()); placed++; }
  } else if (target === 'fill') {
    for (const s of empties()) { if (!rest.length) break; setPhoto(s.pi, s.ci, rest.shift()); placed++; }
  }
  save(); renderAll(); renderPanel();
  if (rest.length) toast((placed ? placed + ' foto dipasang · ' : '') + rest.length + ' foto masuk ke tab Foto', { label: 'Susun otomatis', fn: () => autoAll(false) }, 5000);
  else toast(placed === 1 ? 'Foto dipasang' : placed + ' foto dipasang');
}
async function readClipboardFiles() {
  if (!navigator.clipboard?.read) throw new Error('no');
  const items = await navigator.clipboard.read(), files = [];
  for (const it of items) {
    const t = it.types.find(x => x.startsWith('image/'));
    if (t) { const b = await it.getType(t); files.push(new File([b], 'tempel.' + (t.split('/')[1] || 'png'), { type: t })); }
  }
  return files;
}
async function pasteInto(target) {
  try {
    const files = await readClipboardFiles();
    if (!files.length) { toast('Papan klip tidak berisi gambar'); return; }
    if (!P) { newAutoFromFiles(files); return; }
    addFiles(files, target);
  } catch (e) { toast(coarse ? 'Izinkan akses papan klip untuk menempel' : 'Tekan Ctrl/⌘+V untuk menempel gambar'); }
}
let pickTarget = null;
function pick(target) { pickTarget = target; const f = $('#file'); f.value = ''; f.click(); }
$('#file').addEventListener('change', e => {
  const files = [...e.target.files]; if (!files.length) return;
  const t = pickTarget; pickTarget = null;
  if (t === 'new-auto') newAutoFromFiles(files); else addFiles(files, t);
});

// ---------- history + save ----------
function mark() { H.u.push(JSON.stringify(P)); if (H.u.length > 80) H.u.shift(); H.r.length = 0; H.lk = null; updUndo(); }
function markSoft(key) { const now = Date.now(); if (H.lk === key && now - H.lt < 900) { H.lt = now; return; } mark(); H.lk = key; H.lt = now; }
function undo() { if (!H.u.length) return; H.r.push(JSON.stringify(P)); P = JSON.parse(H.u.pop()); afterHist(); }
function redo() { if (!H.r.length) return; H.u.push(JSON.stringify(P)); P = JSON.parse(H.r.pop()); afterHist(); }
async function afterHist() { sel = null; await loadRecs(P.pool); renderAll(); renderPanel(); save(); updUndo(); }
function updUndo() { $('#bUndo').disabled = !H.u.length; $('#bRedo').disabled = !H.r.length; }
let saveT, thumbT;
function save() {
  if (!P) return;
  P.updated = Date.now();
  clearTimeout(saveT); saveT = setTimeout(saveNow, 450);
  clearTimeout(thumbT); thumbT = setTimeout(makeThumb, 1200);
}
async function saveNow() { clearTimeout(saveT); if (P) await put('projects', JSON.parse(JSON.stringify(P))); }
async function makeThumb() {
  if (!P || !P.pages[0]) return;
  const p = P, d = dims(p), k = 300 / Math.max(d.w, d.h);
  try { const cv = await renderPage(p, p.pages[0], k, id => ensurePrev(id), { opaque: true }); p.thumb = cv.toDataURL('image/jpeg', .75); if (p === P) saveNow(); } catch (e) { }
}

// ---------- gallery ----------
const QUICK = [
  { n: 'Kolase A4', s: 'Tegak · 210×297 mm', paper: 'a4', tpl: 't:v(2x,h(x,x))' },
  { n: 'A4 mendatar', s: '297×210 mm', paper: 'a4', land: true, tpl: 't:h(2x,v(x,x))' },
  { n: 'Persegi', s: '1:1 · 2160 px', paper: 'sq', tpl: 'g:2x2' },
  { n: 'Instagram', s: '4:5 · 1080×1350', paper: 'ig', tpl: 't:v(h(x,x),h(x,x,x))' },
  { n: 'Story', s: '9:16 · 1080×1920', paper: 'story', tpl: 't:v(x,x,x)' },
  { n: 'Foto 4R', s: '102×152 mm', paper: '4r', tpl: 't:v(2x,h(x,x))' },
  { n: 'Lanskap 16:9', s: '1920×1080 px', paper: 'wide', tpl: 't:h(2x,v(x,x))' },
  { n: 'Cetak banyak foto', s: 'Susun otomatis A4', auto: true }
];
function tplSvg(rects, d, gap = 2.6, cls = 'c') {
  const s = 100 / Math.max(d.w, d.h), W = d.w * s, Hh = d.h * s;
  let h = '<svg viewBox="0 0 ' + W.toFixed(1) + ' ' + Hh.toFixed(1) + '"><rect class="bg" width="' + W.toFixed(1) + '" height="' + Hh.toFixed(1) + '" rx="2.5"/>';
  for (const r of rects) {
    const x = gap / 2 + r.x * (W - gap) + gap / 2, y = gap / 2 + r.y * (Hh - gap) + gap / 2, w = r.w * (W - gap) - gap, hh = r.h * (Hh - gap) - gap;
    h += '<rect class="' + cls + '" x="' + x.toFixed(2) + '" y="' + y.toFixed(2) + '" width="' + Math.max(.5, w).toFixed(2) + '" height="' + Math.max(.5, hh).toFixed(2) + '" rx="1.2"/>';
  }
  return h + '</svg>';
}
const QCOL = ['#60a5fa', '#f472b6', '#fbbf24', '#34d399', '#a78bfa', '#fb923c'];
function quickSvg(q) {
  const pp = paperById(q.paper || 'a4'), d = q.land ? { w: pp.h, h: pp.w } : { w: pp.w, h: pp.h };
  const t = q.auto ? { rects: [{ x: 0, y: 0, w: .6, h: .34 }, { x: .6, y: 0, w: .4, h: .34 }, { x: 0, y: .34, w: .38, h: .36 }, { x: .38, y: .34, w: .62, h: .36 }, { x: 0, y: .7, w: .5, h: .3 }, { x: .5, y: .7, w: .5, h: .3 }] } : tplById(q.tpl);
  const s = 54 / Math.max(d.w, d.h), W = d.w * s, Hh = d.h * s;
  let h = '<svg width="' + W.toFixed(1) + '" height="' + Hh.toFixed(1) + '" viewBox="0 0 ' + W.toFixed(1) + ' ' + Hh.toFixed(1) + '"><rect width="100%" height="100%" rx="2" fill="#fff"/>';
  const g = q.auto ? 0 : 1.6;
  t.rects.forEach((r, i) => { h += '<rect x="' + (r.x * W + g / 2 + (r.x ? 0 : g / 2)).toFixed(2) + '" y="' + (r.y * Hh + g / 2 + (r.y ? 0 : g / 2)).toFixed(2) + '" width="' + Math.max(1, r.w * W - g - (r.x ? 0 : g / 2) - (r.x + r.w > .999 ? g / 2 : 0)).toFixed(2) + '" height="' + Math.max(1, r.h * Hh - g - (r.y ? 0 : g / 2) - (r.y + r.h > .999 ? g / 2 : 0)).toFixed(2) + '" fill="' + QCOL[i % QCOL.length] + '" rx="1"/>'; });
  return h + '</svg>';
}
async function showGallery() {
  if (P) { await saveNow(); if (H.u.length || !P.thumb) await makeThumb(); }
  P = null; sel = null; H.u.length = H.r.length = 0;
  $('#toast').classList.remove('on');
  $('#editor').hidden = true; $('#gallery').hidden = false; $('#ctb').hidden = true;
  document.title = 'Kolase';
  $('#gQuick').innerHTML = QUICK.map((q, i) => '<button class="qk" data-q="' + i + '"><div class="shp">' + quickSvg(q) + '</div><b>' + esc(q.n) + '</b><small>' + esc(q.s) + '</small></button>').join('');
  const list = (await getAll('projects')).sort((a, b) => b.updated - a.updated);
  $('#gGrid').innerHTML = list.length ? list.map(p => {
    const n = p.pages.reduce((s, g) => s + g.cells.filter(c => c.ph).length, 0);
    return '<div class="card" data-id="' + p.id + '"><div class="th">' + (p.thumb ? '<img src="' + p.thumb + '" alt="">' : '<div class="ph"></div>') + '</div><div class="meta"><div><b>' + esc(p.name) + '</b><small>' + p.pages.length + ' hal · ' + n + ' foto · ' + new Date(p.updated).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + '</small></div><button class="ib sm" data-more="' + p.id + '" title="Lainnya">' + ic('more') + '</button></div></div>';
  }).join('') : '<div class="empty">Belum ada proyek. Seret foto ke kotak di atas atau pilih ukuran kolase.</div>';
  gcPhotos(list);
  for (const p of list) if (!p.thumb && p.pool.length && !$('#gallery').hidden) {
    try {
      await loadRecs(p.pool); const d = dims(p), cv = await renderPage(p, p.pages[0], 300 / Math.max(d.w, d.h), id => ensurePrev(id), { opaque: true });
      p.thumb = cv.toDataURL('image/jpeg', .75); await put('projects', p);
      const im = document.querySelector('.card[data-id="' + p.id + '"] .th'); if (im) im.innerHTML = '<img src="' + p.thumb + '" alt="">';
    } catch (e) { }
  }
}
async function gcPhotos(list) {
  try {
    const keep = new Set(); list.forEach(p => p.pool.forEach(id => keep.add(id)));
    const all = await getAll('photos');
    for (const r of all) if (!keep.has(r.id) && Date.now() - (r.t || 0) > 60000) { await del('photos', r.id); recs.delete(r.id); prevs.delete(r.id); }
  } catch (e) { }
}
$('#gQuick').addEventListener('click', e => {
  const b = e.target.closest('.qk'); if (!b) return;
  const q = QUICK[+b.dataset.q];
  if (q.auto) { pick('new-auto'); return; }
  const p = newProject({ paper: q.paper, land: q.land, tpl: q.tpl, name: q.n + ' ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) });
  openProject(p, 'layout');
});
$('#gGrid').addEventListener('click', async e => {
  const m = e.target.closest('[data-more]');
  if (m) {
    e.stopPropagation();
    const id = m.dataset.more, r = m.getBoundingClientRect();
    menu(r.left - 140, r.bottom + 4, [
      { t: 'Buka', ic: 'edit', fn: async () => openProject(await get('projects', id)) },
      { t: 'Duplikat', ic: 'copy', fn: async () => { const p = await get('projects', id); p.id = uid(); p.name += ' (salinan)'; p.updated = p.created = Date.now(); await put('projects', p); showGallery(); } },
      { t: 'Ganti nama', ic: 'type', fn: async () => { const p = await get('projects', id); const n = prompt('Nama proyek', p.name); if (n && n.trim()) { p.name = n.trim(); await put('projects', p); showGallery(); } } },
      { t: 'Hapus', ic: 'trash', danger: true, fn: async () => { if (!confirm('Hapus proyek ini beserta fotonya?')) return; await del('projects', id); showGallery(); } }
    ]);
    return;
  }
  const c = e.target.closest('.card'); if (c) openProject(await get('projects', c.dataset.id));
});
$('#gNew').onclick = () => openProject(newProject({ tpl: 't:v(2x,h(x,x))', name: 'Kolase ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) }), 'layout');
$('#heroPick').onclick = () => pick('new-auto');
$('#heroPaste').onclick = () => pasteInto('auto');
async function newAutoFromFiles(files) {
  const p = newProject({ name: 'Cetak foto ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }), style: { gap: 0, margin: 0 }, pages: [] });
  await openProject(p, 'photos', true);
  await addFiles(files, 'auto');
  if (!P.pool.length) { P.pages = [newPage('g:2x2')]; renderAll(); }
  else if (isMob()) setSide(false);
}

// ---------- editor ----------
async function openProject(p, t, noRender) {
  if (!p) return;
  P = p; sel = null; cur = 0; view.zoom = 1; H.u.length = H.r.length = 0;
  P.auto = Object.assign({ per: 'auto', mode: 'auto', smart: true, rotate: false, seed: 1 }, P.auto || {});
  $('#gallery').hidden = true; $('#editor').hidden = false;
  $('#pName').value = P.name; document.title = P.name + ' — Kolase';
  await loadRecs(P.pool);
  tab = t || (P.pool.length ? 'photos' : 'layout');
  setSide(!isMob() || !!t);
  updUndo(); renderRail();
  if (!noRender) { renderAll(); renderPanel(); }
  save();
}
$('#bBack').onclick = showGallery;
$('#pName').addEventListener('change', e => { P.name = e.target.value.trim() || 'Kolase tanpa judul'; document.title = P.name + ' — Kolase'; save(); });
$('#pName').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });
$('#bUndo').onclick = undo; $('#bRedo').onclick = redo;
$('#bZo').onclick = () => zoomView(1 / 1.2); $('#bZi').onclick = () => zoomView(1.2); $('#bZv').onclick = () => { view.zoom = 1; renderAll(); };
$('#gTheme').onclick = $('#bTheme').onclick = toggleTheme;
$('#bExport').onclick = exportDlg;
$('#bPrint').onclick = printAll;
function zoomView(f) { view.zoom = clamp(view.zoom * f, .25, 5); renderAll(); }

// ----- pages -----
const vis = new Set();
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { vis.add(e.target); if (e.target.dataset.dirty) drawPage(+e.target.parentNode.dataset.i); } else vis.delete(e.target);
}), { root: stage, rootMargin: '500px' });
const addPageBtn = document.createElement('button');
addPageBtn.className = 'btn add-page'; addPageBtn.innerHTML = ic('plus') + 'Tambah halaman';
addPageBtn.onclick = () => pageAct('add', P.pages.length - 1);
pagesEl.append(addPageBtn);
const pageEl = i => pagesEl.children[i]?.querySelector('.page');
const cellOf = s => s && s.ci != null ? P.pages[s.pi]?.cells[s.ci] : null;

function computeK() {
  const d = dims(P), m = isMob();
  const aw = Math.max(160, stage.clientWidth - (m ? 20 : 60)), ah = Math.max(160, stage.clientHeight - (m ? 60 : 96));
  view.k = Math.min(aw / d.w, ah / d.h) * view.zoom;
}
function renderAll() {
  if (!P) return;
  cur = clamp(cur, 0, Math.max(0, P.pages.length - 1));
  computeK();
  const wraps = [...pagesEl.querySelectorAll('.pw')];
  while (wraps.length > P.pages.length) { const w = wraps.pop(); io.unobserve(w.querySelector('.page')); vis.delete(w.querySelector('.page')); w.remove(); }
  while (wraps.length < P.pages.length) {
    const w = document.createElement('div'); w.className = 'pw'; w.innerHTML = '<div class="pw-h"></div><div class="page"></div>';
    pagesEl.insertBefore(w, addPageBtn); io.observe(w.querySelector('.page')); wraps.push(w);
  }
  wraps.forEach((w, i) => { w.dataset.i = i; buildPage(i); });
  $('#bZv').textContent = Math.round(view.zoom * 100) + '%';
  renderCtb();
}
function pageHead(i) {
  const pg = P.pages[i], n = pg.cells.filter(c => c.ph).length, tot = P.pages.length;
  return '<b>Halaman ' + (i + 1) + '</b><span>&nbsp;/ ' + tot + ' · ' + n + ' foto</span><div class="sp"></div>' +
    '<button class="ib sm" data-pg="auto" title="Tata otomatis foto di halaman ini">' + ic('auto') + '</button>' +
    '<button class="ib sm" data-pg="up" title="Pindah ke atas"' + (i ? '' : ' disabled') + '>' + ic('up') + '</button>' +
    '<button class="ib sm" data-pg="down" title="Pindah ke bawah"' + (i < tot - 1 ? '' : ' disabled') + '>' + ic('down') + '</button>' +
    '<button class="ib sm" data-pg="dup" title="Duplikat halaman">' + ic('copy') + '</button>' +
    '<button class="ib sm" data-pg="add" title="Tambah halaman setelah ini">' + ic('plus') + '</button>' +
    '<button class="ib sm" data-pg="del" title="Hapus halaman">' + ic('trash') + '</button>';
}
function textCss(t, W, Hh, k) {
  const fs = t.size * k, pad = t.bg ? fs * .35 : 0;
  return 'left:' + (t.x * W) + 'px;top:' + (t.y * Hh) + 'px;font:' + textFont(t, fs).replace(/"/g, "'") + ';line-height:1.2;color:' + t.color + ';text-align:' + (t.align || 'center') +
    ';padding:' + pad + 'px;border-radius:' + pad + 'px;background:' + (t.bg || 'transparent') + ';text-shadow:' + (t.shadow ? '0 ' + fs * .05 + 'px ' + fs * .22 + 'px rgba(0,0,0,.5)' : 'none');
}
function phHtml(b, isSel) {
  const cls = b.w < 74 || b.h < 56 ? 'mini' : b.w < 150 || b.h < 110 ? 'tiny' : '';
  return '<div class="ph ' + cls + '">' + ic('imgplus') + '<div class="pb"><button data-act="up" title="Unggah foto">' + ic('upload') + '<span class="lbl">Unggah</span></button><button data-act="paste" title="Tempel dari papan klip">' + ic('paste') + '<span class="lbl">Tempel</span></button></div>' +
    '<small class="' + (isSel ? 'hint' : '') + '">' + (isSel ? (coarse ? 'Ketuk Tempel untuk menempel' : 'Tekan Ctrl/⌘+V untuk menempel') : 'atau seret foto ke sini') + '</small></div>';
}
function buildPage(i) {
  const pg = P.pages[i], w = pagesEl.children[i], el = w.querySelector('.page');
  const d = dims(P), k = view.k, W = Math.round(d.w * k), Hh = Math.round(d.h * k), st = P.style;
  w.classList.toggle('cur', i === cur);
  w.style.width = W + 'px';
  w.querySelector('.pw-h').innerHTML = pageHead(i);
  el.style.width = W + 'px'; el.style.height = Hh + 'px'; el.style.background = bgCss(st.bg);
  const shd = st.shadow > 0 ? 'filter:drop-shadow(0 ' + (st.shadow * k * .35).toFixed(1) + 'px ' + (st.shadow * k * 1.2).toFixed(1) + 'px rgba(0,0,0,.38));' : '';
  let h = '';
  pg.cells.forEach((c, ci) => {
    const b = cellBox(c, st, W, Hh, k), isSel = sel && sel.pi === i && sel.ci === ci;
    h += '<div class="cell' + (c.ph ? '' : ' empty') + (isSel ? ' sel' : '') + '" data-c="' + ci + '" style="left:' + b.x.toFixed(2) + 'px;top:' + b.y.toFixed(2) + 'px;width:' + b.w.toFixed(2) + 'px;height:' + b.h.toFixed(2) + 'px;' + (c.ph ? shd : '') + '"><canvas></canvas>' + (c.ph ? '' : phHtml(b, isSel)) + '</div>';
  });
  (pg.texts || []).forEach((t, ti) => {
    h += '<div class="txt' + (sel && sel.pi === i && sel.ti === ti ? ' sel' : '') + '" data-t="' + ti + '" style="' + textCss(t, W, Hh, k) + '">' + esc(t.txt) + '</div>';
  });
  el.innerHTML = h;
  el.dataset.dirty = 1;
  if (vis.has(el)) drawPage(i);
}
function drawPage(i) {
  const el = pageEl(i); if (!el || !P.pages[i]) return;
  delete el.dataset.dirty;
  P.pages[i].cells.forEach((_, ci) => drawCellEl(i, ci));
}
function drawCellEl(pi, ci) {
  const el = pageEl(pi)?.querySelector('.cell[data-c="' + ci + '"]'); if (!el) return;
  const c = P.pages[pi].cells[ci], cv = el.querySelector('canvas'), st = P.style;
  const w = parseFloat(el.style.width), h = parseFloat(el.style.height), dpr = Math.min(2.5, devicePixelRatio || 1);
  cv.width = Math.max(1, Math.round(w * dpr)); cv.height = Math.max(1, Math.round(h * dpr));
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!c.ph) {
    shapePath(ctx, st.shape, w, h, st.radius * view.k); ctx.fillStyle = 'rgba(238,238,243,.94)'; ctx.fill();
    ctx.setLineDash([5, 4]); ctx.lineWidth = 1.3; ctx.strokeStyle = 'rgba(110,110,125,.55)';
    ctx.save(); shapePath(ctx, st.shape, w, h, st.radius * view.k); ctx.clip(); shapePath(ctx, st.shape, w, h, st.radius * view.k); ctx.lineWidth = 2.6; ctx.stroke(); ctx.restore();
    return;
  }
  const img = prevs.get(c.ph);
  if (!img) {
    shapePath(ctx, st.shape, w, h, st.radius * view.k); ctx.fillStyle = '#d9d9df'; ctx.fill();
    ensurePrev(c.ph).then(b => b && drawCellEl(pi, ci));
    return;
  }
  paintCell(ctx, cellImage(img, c, w * dpr, h * dpr), st, w, h, view.k, false);
}
function setCur(i) {
  if (i === cur) return;
  const o = pagesEl.children[cur]; if (o) o.classList.remove('cur');
  cur = i; const n = pagesEl.children[cur]; if (n) n.classList.add('cur');
  if (tab === 'layout') renderPanel();
}
function select(s) {
  const old = sel; sel = s;
  if (s) setCur(s.pi);
  const pages = new Set([old?.pi, s?.pi].filter(x => x != null));
  pages.forEach(pi => { if (P.pages[pi]) buildPage(pi); });
  renderCtb();
  if (tab === 'filter' || tab === 'text') renderPanel();
}
function pageAct(a, i) {
  const pg = P.pages[i];
  if (a === 'auto') { autoPage(i); return; }
  mark();
  if (a === 'up' && i > 0) { P.pages.splice(i - 1, 0, P.pages.splice(i, 1)[0]); cur = i - 1; }
  else if (a === 'down' && i < P.pages.length - 1) { P.pages.splice(i + 1, 0, P.pages.splice(i, 1)[0]); cur = i + 1; }
  else if (a === 'dup') { const c = JSON.parse(JSON.stringify(pg)); c.id = uid(); c.cells.forEach(x => x.id = uid()); P.pages.splice(i + 1, 0, c); cur = i + 1; }
  else if (a === 'add') { const t = tplById(pg?.tpl) ? pg.tpl : 'g:2x2'; P.pages.splice(i + 1, 0, newPage(t)); cur = i + 1; }
  else if (a === 'del') {
    if (P.pages.length === 1) { pg.cells.forEach(c => c.ph = null); pg.texts = []; }
    else { P.pages.splice(i, 1); cur = Math.min(i, P.pages.length - 1); }
  }
  sel = null; save(); renderAll(); renderPanel();
  if (a === 'add' || a === 'dup') requestAnimationFrame(() => pagesEl.children[cur]?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
}
function autoPage(i) {
  const pg = P.pages[i], ids = pg.cells.filter(c => c.ph).map(c => c.ph);
  if (!ids.length) { toast('Halaman ini belum berisi foto'); return; }
  mark();
  pg._seed = (pg._seed || 0) + 1;
  const d = dims(P), st = P.style, fl = new Map(pg.cells.filter(c => c.ph).map(c => [c.ph, c.flt]));
  const r = layoutPage(ids.map(id => ({ id, a: recs.get(id) ? recs.get(id).w / recs.get(id).h : 1 })), Object.assign({}, P.auto, { seed: pg._seed, W: d.w - 2 * st.margin, H: d.h - 2 * st.margin, gap: st.gap, mode: pg._seed > 1 ? 'mosaic' : P.auto.mode }));
  pg.cells = r.cells.map(c => Object.assign(newCell(c, c.ph), { rot: c.rot, flt: fl.get(c.ph) || null }));
  pg.tpl = 'auto'; sel = null;
  save(); renderAll(); renderPanel();
  toast('Halaman ' + (i + 1) + ' ditata ulang — tekan lagi untuk variasi lain');
}
function autoAll(newSeed) {
  const ids = P.pool.filter(id => recs.has(id));
  if (!ids.length) { toast('Tambahkan foto terlebih dahulu'); return; }
  if (newSeed !== false) mark();
  if (newSeed === true) P.auto.seed = (P.auto.seed || 1) + 1;
  const d = dims(P), st = P.style;
  const o = Object.assign({}, P.auto, { W: d.w - 2 * st.margin, H: d.h - 2 * st.margin, gap: st.gap });
  const pages = autoArrange(ids.map(id => ({ id, a: recs.get(id).w / recs.get(id).h })), o);
  const fl = new Map(); P.pages.forEach(p => p.cells.forEach(c => { if (c.ph && c.flt) fl.set(c.ph, c.flt); }));
  P.pages = pages.map(pg => ({ id: uid(), tpl: 'auto', texts: [], cells: pg.cells.map(c => Object.assign(newCell(c, c.ph), { rot: c.rot, flt: fl.get(c.ph) || null })) }));
  sel = null; cur = 0;
  save(); renderAll(); renderPanel();
  stage.scrollTo({ top: 0 });
  toast(ids.length + ' foto ditata ke ' + pages.length + ' halaman ' + (paperById(P.paper.id)?.n || ''), { label: 'Urungkan', fn: undo });
}
function applyTemplate(pi, t) {
  mark();
  const pg = P.pages[pi], old = pg.cells.filter(c => c.ph);
  pg.cells = t.rects.map((r, i) => { const c = newCell(r), o = old[i]; if (o) Object.assign(c, { ph: o.ph, flt: o.flt, flip: o.flip }); return c; });
  pg.tpl = t.id; sel = null;
  save(); buildPage(pi); renderCtb(); renderPanel();
  if (old.length > t.n) toast((old.length - t.n) + ' foto tidak muat — tetap tersimpan di tab Foto');
}
function splitCell(s, dir) {
  mark();
  const pg = P.pages[s.pi], c = pg.cells[s.ci];
  const a = newCell(c), b = newCell(c);
  if (dir === 'h') { a.w = b.w = c.w / 2; b.x = c.x + c.w / 2; } else { a.h = b.h = c.h / 2; b.y = c.y + c.h / 2; }
  Object.assign(a, { ph: c.ph, flt: c.flt, flip: c.flip });
  pg.cells.splice(s.ci, 1, a, b); pg.tpl = 'custom';
  sel = { pi: s.pi, ci: s.ci + 1 };
  save(); buildPage(s.pi); renderCtb();
}

pagesEl.addEventListener('click', e => {
  const pgb = e.target.closest('[data-pg]');
  if (pgb) { pageAct(pgb.dataset.pg, +pgb.closest('.pw').dataset.i); return; }
  const ab = e.target.closest('[data-act]');
  if (ab) {
    const pi = +ab.closest('.pw').dataset.i, ci = +ab.closest('.cell').dataset.c;
    if (!(sel && sel.pi === pi && sel.ci === ci)) select({ pi, ci });
    if (ab.dataset.act === 'up') pick({ pi, ci }); else pasteInto({ pi, ci });
  }
});
pagesEl.addEventListener('dblclick', e => {
  const t = e.target.closest('.txt');
  if (t) { editText(+t.closest('.pw').dataset.i, +t.dataset.t); return; }
  const c = e.target.closest('.cell');
  if (c && !e.target.closest('button')) pick({ pi: +c.closest('.pw').dataset.i, ci: +c.dataset.c });
});

// ----- pointer gestures: pan / pinch / swap drag / pool drag / text move -----
let G = null;
const ptrs = new Map();
const pdist = () => { const [a, b] = [...ptrs.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
function ghostStart(id, x, y) {
  G.drag = true;
  const g = document.createElement('div'); g.className = 'ghost'; g.style.backgroundImage = 'url("' + urls.get(id) + '")';
  document.body.append(g); G.ghost = g; ghostMove(x, y);
  if (navigator.vibrate && G.touch) navigator.vibrate(10);
}
function dropTarget(x, y) {
  const el = document.elementFromPoint(x, y)?.closest('.cell');
  if (!el || !el.closest('#pages')) return null;
  return { el, pi: +el.closest('.pw').dataset.i, ci: +el.dataset.c };
}
function ghostMove(x, y) {
  G.ghost.style.left = x + 'px'; G.ghost.style.top = y + 'px';
  const t = dropTarget(x, y);
  document.querySelectorAll('.cell.dropt').forEach(c => c !== t?.el && c.classList.remove('dropt'));
  if (t && !(G.type === 'cell' && t.pi === G.pi && t.ci === G.ci)) t.el.classList.add('dropt');
}
const SWAP = ['ph', 'fx', 'fy', 'z', 'rot', 'ang', 'flip', 'flt'];
function ghostDrop(G, x, y) {
  const t = dropTarget(x, y);
  G.ghost?.remove(); document.querySelectorAll('.cell.dropt').forEach(c => c.classList.remove('dropt'));
  if (!t) return;
  if (G.type === 'cell') {
    if (t.pi === G.pi && t.ci === G.ci) return;
    mark();
    const a = P.pages[G.pi].cells[G.ci], b = P.pages[t.pi].cells[t.ci];
    for (const k of SWAP) { const v = a[k]; a[k] = b[k]; b[k] = v; }
    a.fx = a.fy = b.fx = b.fy = .5;
    sel = { pi: t.pi, ci: t.ci };
    save(); buildPage(G.pi); if (t.pi !== G.pi) buildPage(t.pi); setCur(t.pi); renderCtb();
  } else if (G.type === 'pool') {
    mark(); setPhoto(t.pi, t.ci, G.id); sel = { pi: t.pi, ci: t.ci };
    save(); renderAll(); setCur(t.pi); renderPanel();
  }
}
function panBy(c, dx, dy, w, h) {
  const r = recs.get(c.ph); if (!r) return;
  const g = photoGeom(r.w, r.h, c, w, h), cs = Math.cos(g.th), sn = Math.sin(g.th);
  const dxr = dx * cs + dy * sn, dyr = -dx * sn + dy * cs;
  if (g.ox > .5) c.fx = clamp((c.fx ?? .5) - dxr / g.ox, 0, 1);
  if (g.oy > .5) c.fy = clamp((c.fy ?? .5) - dyr / g.oy, 0, 1);
}
pagesEl.addEventListener('pointerdown', e => {
  if (e.button > 0 || e.target.closest('button')) return;
  const pw = e.target.closest('.pw'); if (!pw) return;
  const pi = +pw.dataset.i, touch = e.pointerType === 'touch';
  const tEl = e.target.closest('.txt');
  if (tEl) {
    if (tEl.isContentEditable) return;
    const ti = +tEl.dataset.t, t = P.pages[pi].texts[ti];
    G = { type: 'text', pi, ti, el: tEl, x0: e.clientX, y0: e.clientY, tx: t.x, ty: t.y, moved: false, id: e.pointerId };
    e.preventDefault(); return;
  }
  const cEl = e.target.closest('.cell');
  if (!cEl) { if (e.target.closest('.page')) { setCur(pi); if (sel) select(null); } return; }
  const ci = +cEl.dataset.c, c = P.pages[pi].cells[ci], isSel = sel && sel.pi === pi && sel.ci === ci;
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 2 && G && G.type === 'pan') { G.pinch = { d0: pdist(), z0: c.z || 1 }; markSoft('z' + c.id); return; }
  G = { type: isSel && c.ph ? 'pan' : 'cell', pi, ci, c, el: cEl, x0: e.clientX, y0: e.clientY, lx: e.clientX, ly: e.clientY, moved: false, touch, id: e.pointerId };
  if (G.type === 'pan') { e.preventDefault(); try { cEl.setPointerCapture(e.pointerId); } catch (er) { } }
  else if (c.ph && touch) { const g = G; G.lp = setTimeout(() => { if (G === g && !g.moved) ghostStart(c.ph, g.lx, g.ly); }, 330); }
});
$('#panel').addEventListener('pointerdown', e => {
  const t = e.target.closest('.pt'); if (!t || e.target.closest('button') || e.button > 0) return;
  const touch = e.pointerType === 'touch';
  G = { type: 'pool', id: t.dataset.id, x0: e.clientX, y0: e.clientY, lx: e.clientX, ly: e.clientY, moved: false, touch, pid: e.pointerId };
  if (touch) { const g = G; G.lp = setTimeout(() => { if (G === g && !g.moved) { ghostStart(g.id, g.lx, g.ly); if (isMob()) setSide(false); } }, 300); }
  else e.preventDefault();
});
addEventListener('pointermove', e => {
  if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (!G) return;
  const dx0 = e.clientX - G.x0, dy0 = e.clientY - G.y0, far = Math.hypot(dx0, dy0) > 6;
  if (G.type === 'pan') {
    const c = G.c;
    if (G.pinch && ptrs.size >= 2) { c.z = clamp(G.pinch.z0 * pdist() / G.pinch.d0, 1, 6); drawCellEl(G.pi, G.ci); syncCtb(); return; }
    if (G.pinch) return;
    const dx = e.clientX - G.lx, dy = e.clientY - G.ly; G.lx = e.clientX; G.ly = e.clientY;
    if (!G.moved) { if (Math.hypot(dx0, dy0) < 3) return; G.moved = true; markSoft('pan' + c.id); }
    panBy(c, dx, dy, parseFloat(G.el.style.width), parseFloat(G.el.style.height));
    drawCellEl(G.pi, G.ci);
  } else if (G.type === 'cell' || G.type === 'pool') {
    G.lx = e.clientX; G.ly = e.clientY;
    if (G.drag) { ghostMove(e.clientX, e.clientY); return; }
    if (far) {
      G.moved = true; clearTimeout(G.lp);
      if (G.touch) { G = null; return; }
      const id = G.type === 'pool' ? G.id : G.c.ph;
      if (id) ghostStart(id, e.clientX, e.clientY); else G = null;
    }
  } else if (G.type === 'text') {
    if (!G.moved) { if (!far) return; G.moved = true; markSoft('txt'); }
    const d = dims(P), W = d.w * view.k, Hh = d.h * view.k, t = P.pages[G.pi].texts[G.ti];
    t.x = clamp(G.tx + dx0 / W, 0, 1); t.y = clamp(G.ty + dy0 / Hh, 0, 1);
    G.el.style.left = t.x * W + 'px'; G.el.style.top = t.y * Hh + 'px';
  }
});
function endPtr(e, cancel) {
  ptrs.delete(e.pointerId);
  if (!G) return;
  const g = G;
  if (g.type === 'pan') {
    if (g.pinch) { if (ptrs.size === 0) { G = null; save(); syncCtb(); } else { g.pinch = null; const p = [...ptrs.values()][0]; g.lx = p.x; g.ly = p.y; } return; }
    G = null; if (g.moved) save();
    return;
  }
  if (g.type === 'cell') {
    clearTimeout(g.lp); G = null;
    if (g.drag) ghostDrop(g, e.clientX, e.clientY);
    else if (!g.moved && !cancel) select({ pi: g.pi, ci: g.ci });
    return;
  }
  if (g.type === 'pool') {
    clearTimeout(g.lp); G = null;
    if (g.drag) ghostDrop(g, e.clientX, e.clientY);
    else if (!g.moved && !cancel) placeFromPool(g.id);
    return;
  }
  if (g.type === 'text') {
    G = null;
    if (g.moved) save(); else if (!cancel) select({ pi: g.pi, ti: g.ti });
  }
}
addEventListener('pointerup', e => endPtr(e, false));
addEventListener('pointercancel', e => {
  if (G && G.drag) { G.ghost?.remove(); document.querySelectorAll('.cell.dropt').forEach(c => c.classList.remove('dropt')); G = null; ptrs.delete(e.pointerId); return; }
  endPtr(e, true);
});
document.addEventListener('touchmove', e => { if (G && (G.drag || G.type === 'pan' || G.type === 'text')) e.preventDefault(); }, { passive: false });
stage.addEventListener('wheel', e => {
  if (!P) return;
  if (e.ctrlKey || e.metaKey) { e.preventDefault(); zoomView(Math.exp(-e.deltaY * .01)); return; }
  const cEl = e.target.closest('.cell.sel'), c = cellOf(sel);
  if (cEl && c && c.ph) {
    e.preventDefault(); markSoft('z' + c.id);
    c.z = clamp((c.z || 1) * Math.exp(-e.deltaY * .0016), 1, 6);
    drawCellEl(sel.pi, sel.ci); syncCtb(); save();
  }
}, { passive: false });
let scrollRaf;
stage.addEventListener('scroll', () => { cancelAnimationFrame(scrollRaf); scrollRaf = requestAnimationFrame(placeCtb); });
function placeFromPool(id) {
  mark();
  let s = sel && sel.ci != null ? sel : empties()[0];
  if (!s) {
    const pi = cur; P.pages.splice(pi + 1, 0, newPage('t:x')); s = { pi: pi + 1, ci: 0 };
    toast('Semua bingkai terisi — halaman baru ditambahkan');
  }
  setPhoto(s.pi, s.ci, id);
  const nx = empties(s.pi, s.ci)[0];
  sel = nx && nx.pi === s.pi ? nx : { pi: s.pi, ci: s.ci };
  setCur(s.pi);
  save(); renderAll(); renderPanel();
  requestAnimationFrame(() => pageEl(s.pi)?.querySelector('.cell[data-c="' + s.ci + '"]')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
}

// ----- cell toolbar -----
function renderCtb() {
  const t = $('#ctb');
  if (!P || !sel) { t.hidden = true; return; }
  if (sel.ti != null) {
    t.innerHTML = '<button class="tbtn" data-a="tedit">' + ic('edit') + 'Ubah teks</button><button class="ib" data-a="tdup" title="Duplikat">' + ic('copy') + '</button><button class="ib" data-a="tdel" title="Hapus teks">' + ic('trash') + '</button>';
  } else {
    const c = cellOf(sel); if (!c) { t.hidden = true; return; }
    t.innerHTML = c.ph
      ? '<button class="tbtn" data-a="up" title="Ganti foto">' + ic('upload') + 'Ganti</button><button class="ib" data-a="paste" title="Tempel">' + ic('paste') + '</button><span class="sep"></span>' +
      '<button class="ib" data-a="rot" title="Putar 90°">' + ic('rotate') + '</button><button class="ib" data-a="flip" title="Cermin">' + ic('flip') + '</button><span class="sep"></span>' +
      '<button class="ib" data-a="zo" title="Perkecil">' + ic('minus') + '</button><input type="range" data-a="z" min="100" max="600" value="' + Math.round((c.z || 1) * 100) + '" title="Perbesar foto"><button class="ib" data-a="zi" title="Perbesar">' + ic('plus') + '</button><span class="sep"></span>' +
      '<span class="lb">Luruskan</span><input type="range" data-a="ang" min="-45" max="45" step=".5" value="' + (c.ang || 0) + '" title="Luruskan (miring)"><span class="sep"></span>' +
      '<button class="ib" data-a="filter" title="Filter">' + ic('filt') + '</button><button class="ib" data-a="reset" title="Atur ulang posisi">' + ic('center') + '</button>' +
      '<button class="ib" data-a="sh" title="Bagi kiri–kanan">' + ic('splitH') + '</button><button class="ib" data-a="sv" title="Bagi atas–bawah">' + ic('splitV') + '</button><button class="ib" data-a="clr" title="Kosongkan bingkai">' + ic('imgx') + '</button>'
      : '<button class="tbtn" data-a="up">' + ic('upload') + 'Unggah</button><button class="tbtn" data-a="paste">' + ic('paste') + 'Tempel</button><span class="lb">' + (coarse ? '' : 'atau Ctrl/⌘+V') + '</span><span class="sep"></span>' +
      '<button class="ib" data-a="sh" title="Bagi kiri–kanan">' + ic('splitH') + '</button><button class="ib" data-a="sv" title="Bagi atas–bawah">' + ic('splitV') + '</button>';
  }
  t.hidden = false; placeCtb();
}
function syncCtb() { const c = cellOf(sel); if (!c) return; const z = $('#ctb [data-a="z"]'); if (z) z.value = Math.round((c.z || 1) * 100); }
function placeCtb() {
  const t = $('#ctb'); if (t.hidden || !sel) return;
  const el = sel.ti != null ? pageEl(sel.pi)?.querySelector('.txt[data-t="' + sel.ti + '"]') : pageEl(sel.pi)?.querySelector('.cell[data-c="' + sel.ci + '"]');
  if (!el) { t.style.visibility = 'hidden'; return; }
  const r = el.getBoundingClientRect(), sr = stage.getBoundingClientRect(), tw = t.offsetWidth, th = t.offsetHeight;
  if (r.bottom < sr.top || r.top > sr.bottom) { t.style.visibility = 'hidden'; return; }
  t.style.visibility = '';
  let x, y;
  if (isMob()) {
    x = (innerWidth - tw) / 2;
    const side = $('#side'), rt = $('#rail').getBoundingClientRect().top, bottom = side.classList.contains('closed') ? rt : rt - side.offsetHeight;
    y = bottom - th - 8;
  } else {
    x = clamp(r.left + r.width / 2 - tw / 2, sr.left + 8, innerWidth - tw - 8);
    y = r.top - th - 10;
    if (y < sr.top + 6) y = r.bottom + 10;
    if (y + th > innerHeight - 8) y = clamp(r.top + 10, sr.top + 6, innerHeight - th - 8);
  }
  t.style.left = x + 'px'; t.style.top = y + 'px';
}
$('#ctb').addEventListener('click', e => {
  const b = e.target.closest('[data-a]'); if (!b || b.tagName === 'INPUT') return;
  const a = b.dataset.a, c = cellOf(sel);
  if (a === 'up') return pick({ pi: sel.pi, ci: sel.ci });
  if (a === 'paste') return pasteInto({ pi: sel.pi, ci: sel.ci });
  if (a === 'filter') { setTab('filter'); return; }
  if (a === 'sh' || a === 'sv') return splitCell(sel, a === 'sh' ? 'h' : 'v');
  if (a === 'tedit') return editText(sel.pi, sel.ti);
  if (a === 'tdel' || a === 'tdup') {
    mark(); const ts = P.pages[sel.pi].texts;
    if (a === 'tdel') { ts.splice(sel.ti, 1); sel = null; } else { const n = Object.assign({}, ts[sel.ti], { id: uid(), y: Math.min(.95, ts[sel.ti].y + .05) }); ts.push(n); sel = { pi: sel.pi, ti: ts.length - 1 }; }
    save(); buildPage(cur); renderCtb(); renderPanel(); return;
  }
  if (!c) return;
  markSoft(a + c.id);
  if (a === 'rot') { c.rot = ((c.rot || 0) + 90) % 360; c.fx = c.fy = .5; }
  else if (a === 'flip') c.flip = !c.flip;
  else if (a === 'zi') c.z = clamp((c.z || 1) * 1.2, 1, 6);
  else if (a === 'zo') c.z = clamp((c.z || 1) / 1.2, 1, 6);
  else if (a === 'reset') Object.assign(c, { fx: .5, fy: .5, z: 1, ang: 0 });
  else if (a === 'clr') { c.ph = null; c.flt = null; save(); buildPage(sel.pi); renderCtb(); renderPanel(); return; }
  drawCellEl(sel.pi, sel.ci); save();
  if (a === 'reset') renderCtb(); else syncCtb();
});
$('#ctb').addEventListener('input', e => {
  const c = cellOf(sel); if (!c) return;
  const a = e.target.dataset.a;
  markSoft(a + c.id);
  if (a === 'z') c.z = e.target.value / 100; else if (a === 'ang') c.ang = +e.target.value;
  drawCellEl(sel.pi, sel.ci); save();
});

// ----- text -----
function addText(txt, size, extra = {}) {
  const pg = P.pages[cur]; if (!pg) return;
  mark();
  const d = dims(P), hasPh = pg.cells.some(c => c.ph);
  const t = Object.assign({ id: uid(), x: .5, y: .5, txt, font: 'Playfair Display', size: size || Math.round(Math.min(d.w, d.h) * .075), color: hasPh ? '#ffffff' : '#1f2937', bold: true, ital: false, align: 'center', bg: '', shadow: hasPh }, extra);
  pg.texts = pg.texts || []; pg.texts.push(t);
  sel = { pi: cur, ti: pg.texts.length - 1 };
  save(); buildPage(cur); renderCtb(); renderPanel();
}
function editText(pi, ti) {
  const el = pageEl(pi)?.querySelector('.txt[data-t="' + ti + '"]'); if (!el) return;
  if (!(sel && sel.pi === pi && sel.ti === ti)) { sel = { pi, ti }; }
  el.contentEditable = 'plaintext-only';
  if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
  el.focus();
  const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  el.addEventListener('blur', () => {
    el.contentEditable = 'false';
    const v = el.innerText.replace(/\n$/, '');
    const t = P.pages[pi]?.texts[ti];
    if (t && v !== t.txt) { mark(); t.txt = v || ' '; save(); }
    buildPage(pi); renderCtb(); if (tab === 'text') renderPanel();
  }, { once: true });
}

// ---------- side panel ----------
const TABS = [['layout', 'Tata letak', 'layout'], ['photos', 'Foto', 'images'], ['style', 'Gaya', 'sliders'], ['filter', 'Filter', 'filt'], ['text', 'Teks', 'type'], ['paper', 'Kertas', 'file']];
function renderRail() { $('#rail').innerHTML = TABS.map(([id, n, i]) => '<button data-tab="' + id + '" class="' + (id === tab && !$('#side').classList.contains('closed') ? 'on' : '') + '">' + ic(i) + n + '</button>').join(''); }
function setSide(open) { $('#side').classList.toggle('closed', !open); renderRail(); requestAnimationFrame(placeCtb); }
function setTab(t) { if (t !== tab) $('#panel').scrollTop = 0; tab = t; setSide(true); renderPanel(); }
$('#rail').addEventListener('click', e => {
  const b = e.target.closest('[data-tab]'); if (!b) return;
  if (b.dataset.tab === tab && !$('#side').classList.contains('closed') && isMob()) { setSide(false); return; }
  if (b.dataset.tab === 'layout') layFilter = 'auto';
  setTab(b.dataset.tab);
});
$('#sideClose').onclick = () => setSide(false);

let sliding = false;
function slider(label, key, val, min, max, step, unit) {
  return '<label class="fld"><span>' + label + '</span><input type="range" data-k="' + key + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '"><output>' + (+val).toFixed(step < 1 ? 1 : 0).replace(/\.0$/, '') + (unit || '') + '</output></label>';
}
function bindSliders(root, apply, after) {
  root.querySelectorAll('input[type=range][data-k]').forEach(inp => {
    const out = inp.parentNode.querySelector('output'), unit = out.textContent.replace(/^[-0-9.]+/, '');
    inp.addEventListener('input', () => {
      if (!sliding) { mark(); sliding = true; }
      const v = +inp.value; out.textContent = (Number.isInteger(+inp.step) ? v : v.toFixed(1)).toString().replace(/\.0$/, '') + unit;
      apply(inp.dataset.k, v);
    });
    inp.addEventListener('change', () => { sliding = false; save(); after && after(); });
  });
}
let rafAll;
const renderAllSoon = () => { cancelAnimationFrame(rafAll); rafAll = requestAnimationFrame(renderAll); };

function renderPanel() {
  if (!P) return;
  const p = $('#panel'), t = TABS.find(x => x[0] === tab);
  $('#sideTitle').textContent = t[1];
  renderRail();
  ({ layout: panelLayout, photos: panelPhotos, style: panelStyle, filter: panelFilter, text: panelText, paper: panelPaper })[tab](p);
}

function panelLayout(p) {
  const pg = P.pages[cur]; if (!pg) { p.innerHTML = ''; return; }
  const n = pg.cells.filter(c => c.ph).length, d = dims(P);
  if (layFilter === 'auto') layFilter = n ? String(Math.min(n, 10)) : 'all';
  const chips = ['all', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  const list = TEMPLATES.filter(t => layFilter === 'all' || (layFilter === '10' ? t.n >= 10 : t.n === +layFilter));
  p.innerHTML = '<p class="hint">Halaman ' + (cur + 1) + ' · ' + pg.cells.length + ' bingkai · ' + n + ' foto. Pilih tata letak — foto yang sudah ada ikut dipindahkan.</p>' +
    '<div class="sec">Jumlah foto</div><div class="chips">' + chips.map(c => '<button class="chip' + (c === layFilter ? ' on' : '') + '" data-f="' + c + '">' + (c === 'all' ? 'Semua' : c === '10' ? '10+' : c) + '</button>').join('') + '</div>' +
    '<div class="tgrid">' + list.map(t => '<button class="tpl' + (t.id === pg.tpl ? ' on' : '') + '" data-t="' + t.id + '" title="' + t.n + ' foto">' + tplSvg(t.rects, d) + '</button>').join('') + '</div>' +
    '<div class="sec">Halaman</div><div class="row"><button class="btn sm" id="lAuto">' + ic('auto') + 'Tata otomatis</button><button class="btn sm" id="lAdd">' + ic('plus') + 'Halaman baru</button><button class="btn sm" id="lClr">' + ic('imgx') + 'Kosongkan</button></div>' +
    '<p class="hint" style="margin-top:12px">Tips: klik bingkai lalu tekan Ctrl/⌘+V untuk menempel foto, atau seret foto dari komputer langsung ke bingkai. Seret foto ke bingkai lain untuk menukar posisi.</p>';
  p.querySelectorAll('.chip').forEach(b => b.onclick = () => { layFilter = b.dataset.f; panelLayout(p); });
  p.querySelectorAll('.tpl').forEach(b => b.onclick = () => applyTemplate(cur, tplById(b.dataset.t)));
  $('#lAuto').onclick = () => autoPage(cur);
  $('#lAdd').onclick = () => pageAct('add', cur);
  $('#lClr').onclick = () => { mark(); pg.cells.forEach(c => { c.ph = null; c.flt = null; }); sel = null; save(); buildPage(cur); renderCtb(); panelLayout(p); };
}

function panelPhotos(p) {
  const u = used(), ids = P.pool.filter(id => recs.has(id)), a = P.auto, d = dims(P);
  const per = a.per === 'auto' ? autoPer(ids.length) : +a.per, pages = ids.length ? Math.ceil(ids.length / Math.max(1, per)) : 0;
  const PER = ['auto', 1, 2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 16, 20, 24, 30];
  p.innerHTML = '<div class="dz" id="dz">' + ic('upload') + '<b>Tambah foto</b><span>Klik, seret banyak foto ke sini, atau tekan Ctrl/⌘+V</span></div>' +
    '<div class="sec">Foto (' + ids.length + ')<span class="sp"></span><span style="text-transform:none;letter-spacing:0;font-weight:500">' + [...u.keys()].filter(k => recs.has(k)).length + ' terpakai</span></div>' +
    (ids.length ? '<div class="pool">' + ids.map(id => '<div class="pt" data-id="' + id + '" style="background-image:url(\'' + urls.get(id) + '\')" title="' + esc(recs.get(id).name) + ' — klik untuk pasang, seret ke bingkai">' + (u.get(id) ? '<span class="us">' + ic('check').replace('class="ic"', 'class="ic" style="width:11px;height:11px"') + '</span>' : '') + '<button class="x" data-rm="' + id + '" title="Hapus foto">' + ic('x') + '</button></div>').join('') + '</div>' +
      '<div class="row"><button class="btn sm" id="pFill">' + ic('imgplus') + 'Isi bingkai kosong</button><button class="btn sm" id="pRm">' + ic('trash') + 'Hapus yang tak terpakai</button></div>' : '<p class="hint">Belum ada foto. Foto yang ditambahkan muncul di sini — klik atau seret ke bingkai.</p>') +
    '<div class="sec" style="margin-top:20px">' + ic('auto') + 'Susun otomatis ke kertas</div><div class="box">' +
    '<div class="kv"><span>Kertas</span><b>' + esc(paperLabel()) + ' · <a href="#" id="goPaper" style="color:var(--acc2)">ganti</a></b></div>' +
    '<label class="fld"><span>Foto / halaman</span><select id="aPer">' + PER.map(v => '<option value="' + v + '"' + (String(a.per) === String(v) ? ' selected' : '') + '>' + (v === 'auto' ? 'Otomatis' : v) + '</option>').join('') + '</select></label>' +
    '<label class="fld"><span>Gaya susunan</span><select id="aMode">' + [['auto', 'Otomatis (terbaik)'], ['rows', 'Baris rapi'], ['mosaic', 'Mosaik'], ['grid', 'Grid seragam']].map(([v, n]) => '<option value="' + v + '"' + (a.mode === v ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></label>' +
    slider('Jarak foto', 'gap', P.style.gap, 0, 15, .5, ' mm') + slider('Margin kertas', 'margin', P.style.margin, 0, 25, .5, ' mm') +
    '<label class="tog"><input type="checkbox" id="aSmart"' + (a.smart ? ' checked' : '') + '>Boleh ubah urutan agar lebih pas</label>' +
    '<label class="tog"><input type="checkbox" id="aRot"' + (a.rotate ? ' checked' : '') + '>Boleh putar foto 90° (untuk dipotong/cetak)</label>' +
    '<div class="kv" style="margin:10px 0"><span>Hasil</span><b>' + ids.length + ' foto → ' + pages + ' halaman</b></div>' +
    '<button class="btn primary block" id="aGo"' + (ids.length ? '' : ' disabled') + '>' + ic('auto') + 'Susun ' + ids.length + ' foto otomatis</button>' +
    '<button class="btn block" id="aVar" style="margin-top:6px"' + (ids.length ? '' : ' disabled') + '>' + ic('shuffle') + 'Coba variasi lain</button></div>' +
    '<p class="hint">Setiap halaman terisi penuh tanpa ruang kosong; foto hanya dipotong sedikit di tepi. Klik foto di halaman lalu geser untuk mengatur bagian yang tampil.' + (d.px ? '' : ' Printer biasanya tidak bisa mencetak sampai tepi — beri margin 3–5 mm bila perlu.') + '</p>';
  const dz = $('#dz');
  dz.onclick = () => pick('pool');
  ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, () => dz.classList.add('over')));
  ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, () => dz.classList.remove('over')));
  p.querySelectorAll('[data-rm]').forEach(b => b.onclick = e => { e.stopPropagation(); removePhoto(b.dataset.rm); });
  const fill = $('#pFill'); if (fill) fill.onclick = () => {
    const un = ids.filter(id => !u.has(id)), sl = empties();
    if (!sl.length) { toast('Tidak ada bingkai kosong'); return; }
    if (!un.length) { toast('Semua foto sudah terpakai'); return; }
    mark(); let k = 0; for (const s of sl) { if (k >= un.length) break; setPhoto(s.pi, s.ci, un[k++]); }
    save(); renderAll(); renderPanel(); toast(k + ' foto dipasang');
  };
  const rm = $('#pRm'); if (rm) rm.onclick = () => { const un = ids.filter(id => !u.has(id)); if (!un.length) { toast('Semua foto terpakai'); return; } mark(); P.pool = P.pool.filter(id => u.has(id)); save(); renderPanel(); toast(un.length + ' foto dihapus dari proyek'); };
  $('#goPaper').onclick = e => { e.preventDefault(); setTab('paper'); };
  $('#aPer').onchange = e => { P.auto.per = e.target.value === 'auto' ? 'auto' : +e.target.value; save(); panelPhotos(p); };
  $('#aMode').onchange = e => { P.auto.mode = e.target.value; save(); };
  $('#aSmart').onchange = e => { P.auto.smart = e.target.checked; save(); };
  $('#aRot').onchange = e => { P.auto.rotate = e.target.checked; save(); };
  $('#aGo').onclick = () => autoAll();
  $('#aVar').onclick = () => autoAll(true);
  bindSliders(p, (k, v) => { P.style[k] = v; renderAllSoon(); });
}
function removePhoto(id) {
  mark();
  P.pool = P.pool.filter(x => x !== id);
  P.pages.forEach(pg => pg.cells.forEach(c => { if (c.ph === id) { c.ph = null; c.flt = null; } }));
  sel = null; save(); renderAll(); renderPanel();
  toast('Foto dihapus', { label: 'Urungkan', fn: undo });
}

const QSTYLE = [
  ['Rapat', { gap: 0, margin: 0, radius: 0, shadow: 0, border: 0 }],
  ['Klasik', { gap: 3, margin: 3, radius: 0, shadow: 0, border: 0, bg: { t: 'solid', c: '#ffffff' } }],
  ['Lebar', { gap: 8, margin: 10, radius: 0, shadow: 0, border: 0, bg: { t: 'solid', c: '#ffffff' } }],
  ['Lembut', { gap: 5, margin: 6, radius: 5, shadow: 2, border: 0, bg: { t: 'solid', c: '#f5efe6' } }],
  ['Gelap', { gap: 2.5, margin: 2.5, radius: 1.5, shadow: 0, border: 0, bg: { t: 'solid', c: '#111111' } }],
  ['Bingkai', { gap: 6, margin: 8, radius: 0, shadow: 2.5, border: 1.5, borderColor: '#ffffff', bg: { t: 'grad', a: '#e5e7eb', b: '#cbd5e1', ang: 160 } }]
];
const BORDER_C = ['#ffffff', '#000000', '#f5efe6', '#d4af37', '#9ca3af', '#7c3aed', '#ef4444', '#0ea5e9'];
function panelStyle(p) {
  const st = P.style;
  const bgOn = b => JSON.stringify(b) === JSON.stringify(st.bg);
  p.innerHTML = '<div class="sec">Gaya cepat</div><div class="chips">' + QSTYLE.map(([n], i) => '<button class="chip" data-q="' + i + '">' + n + '</button>').join('') + '</div>' +
    '<div class="sec">Jarak & tepi</div>' + slider('Jarak foto', 'gap', st.gap, 0, 20, .5, ' mm') + slider('Margin tepi', 'margin', st.margin, 0, 30, .5, ' mm') + slider('Sudut bulat', 'radius', st.radius, 0, 30, .5, ' mm') +
    '<div class="sec">Bentuk foto</div><div class="shapes">' + SHAPES.map(([id, n]) => '<button data-sh="' + id + '" class="' + (st.shape === id ? 'on' : '') + '"><svg viewBox="0 0 24 24" fill="currentColor" opacity=".85">' + SHAPE_IC[id] + '</svg>' + n + '</button>').join('') + '</div>' +
    '<div class="sec">Garis bingkai</div>' + slider('Tebal', 'border', st.border, 0, 6, .25, ' mm') +
    '<div class="sw" id="bcol">' + BORDER_C.map(c => '<button style="background:' + c + '" data-c="' + c + '" class="' + (st.borderColor === c ? 'on' : '') + '"></button>').join('') + '<label title="Warna lain">' + ic('plus') + '<input type="color" value="' + st.borderColor + '"></label></div>' +
    '<div class="sec">Bayangan</div>' + slider('Bayangan', 'shadow', st.shadow, 0, 10, .5, '') +
    '<div class="sec">Latar</div><div class="sw" id="bgs">' + BGS.map((b, i) => '<button data-b="' + i + '" title="' + (b.t === 'none' ? 'Transparan (PNG)' : '') + '" style="background:' + bgCss(b) + '" class="' + (bgOn(b) ? 'on' : '') + '"></button>').join('') + '<label title="Warna lain">' + ic('plus') + '<input type="color" value="' + (st.bg.c || '#ffffff') + '"></label></div>' +
    '<p class="hint">Latar terlihat di sela jarak & margin. Jarak 0 + margin 0 = foto memenuhi kertas penuh.</p>';
  p.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { mark(); Object.assign(P.style, JSON.parse(JSON.stringify(QSTYLE[+b.dataset.q][1]))); save(); renderAll(); panelStyle(p); });
  p.querySelectorAll('[data-sh]').forEach(b => b.onclick = () => { mark(); st.shape = b.dataset.sh; save(); renderAll(); panelStyle(p); });
  p.querySelectorAll('#bcol [data-c]').forEach(b => b.onclick = () => { mark(); st.borderColor = b.dataset.c; if (!st.border) st.border = 1; save(); renderAll(); panelStyle(p); });
  p.querySelector('#bcol input').oninput = e => { markSoft('bc'); st.borderColor = e.target.value; if (!st.border) st.border = 1; save(); renderAllSoon(); };
  p.querySelectorAll('#bgs [data-b]').forEach(b => b.onclick = () => { mark(); st.bg = JSON.parse(JSON.stringify(BGS[+b.dataset.b])); save(); renderAll(); panelStyle(p); });
  p.querySelector('#bgs input').oninput = e => { markSoft('bg'); st.bg = { t: 'solid', c: e.target.value }; save(); renderAllSoon(); };
  bindSliders(p, (k, v) => { st[k] = v; renderAllSoon(); });
}

function panelFilter(p) {
  const c = cellOf(sel), has = c && c.ph;
  if (!has) {
    p.innerHTML = '<p class="hint">Klik salah satu foto di halaman untuk memberi filter dan mengatur warna.</p><div class="sec">Semua foto</div><div class="row"><button class="btn sm" id="fClrAll">Hapus semua filter</button></div>';
    $('#fClrAll').onclick = () => { mark(); P.pages.forEach(pg => pg.cells.forEach(x => x.flt = null)); save(); renderAll(); toast('Filter dihapus dari semua foto'); };
    return;
  }
  const f = c.flt || { p: 'asli' };
  p.innerHTML = '<div class="sec">Preset</div><div class="presets">' + PRESETS.map(([id, n]) => '<button data-p="' + id + '" class="' + ((f.p || 'asli') === id ? 'on' : '') + '"><canvas width="96" height="96"></canvas>' + n + '</button>').join('') + '</div>' +
    '<div class="sec">Atur</div>' + ADJ.map(([k, n, mn, mx]) => slider(n, k, f[k] || 0, mn, mx, 1, '')).join('') +
    '<div class="row" style="margin-top:10px"><button class="btn sm" id="fReset">Atur ulang</button><button class="btn sm" id="fAll">' + ic('copy') + 'Terapkan ke semua foto</button></div>';
  const img = prevs.get(c.ph);
  if (img) p.querySelectorAll('.presets button').forEach(b => {
    const cv = b.querySelector('canvas'), x = cv.getContext('2d', { willReadFrequently: true });
    drawPhoto(x, img, { fx: c.fx, fy: c.fy, z: c.z, rot: c.rot, flip: c.flip }, 96, 96);
    applyFilter(x, 96, 96, effective({ p: b.dataset.p }));
  });
  p.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { mark(); c.flt = { p: b.dataset.p }; save(); drawCellEl(sel.pi, sel.ci); panelFilter(p); });
  $('#fReset').onclick = () => { mark(); c.flt = null; save(); drawCellEl(sel.pi, sel.ci); panelFilter(p); };
  $('#fAll').onclick = () => { mark(); P.pages.forEach(pg => pg.cells.forEach(x => { if (x.ph) x.flt = c.flt ? JSON.parse(JSON.stringify(c.flt)) : null; })); save(); renderAll(); toast('Filter diterapkan ke semua foto'); };
  bindSliders(p, (k, v) => { c.flt = Object.assign({ p: 'asli' }, c.flt || {}, { [k]: v }); drawCellEl(sel.pi, sel.ci); });
}

const TCOL = ['#ffffff', '#000000', '#1f2937', '#ef4444', '#f97316', '#facc15', '#22c55e', '#0ea5e9', '#7c3aed', '#ec4899', '#d4af37'];
function panelText(p) {
  const t = sel && sel.ti != null ? P.pages[sel.pi]?.texts[sel.ti] : null;
  let h = '<button class="btn primary block" id="tAdd">' + ic('plus') + 'Tambah teks</button><div class="row" style="margin-top:6px"><button class="btn sm" id="tAddT">Judul</button><button class="btn sm" id="tAddS">Keterangan</button><button class="btn sm" id="tAddD">Tanggal</button></div>';
  if (t) {
    h += '<div class="sec">Teks terpilih</div><textarea class="inp" id="tTxt">' + esc(t.txt) + '</textarea>' +
      '<div class="sec">Huruf</div><div class="fonts">' + FONTS.map(f => '<button data-font="' + f + '" style="font-family:\'' + f + '\'" class="' + (t.font === f ? 'on' : '') + '">' + f + '</button>').join('') + '</div>' +
      slider('Ukuran', 'size', t.size, 3, 90, .5, ' mm') +
      '<div class="seg"><button data-tg="bold" class="' + (t.bold ? 'on' : '') + '"><b>B</b> Tebal</button><button data-tg="ital" class="' + (t.ital ? 'on' : '') + '"><i>I</i> Miring</button><button data-tg="shadow" class="' + (t.shadow ? 'on' : '') + '">Bayangan</button></div>' +
      '<div class="seg">' + [['left', 'alignL'], ['center', 'alignC'], ['right', 'alignR']].map(([v, i]) => '<button data-al="' + v + '" class="' + ((t.align || 'center') === v ? 'on' : '') + '">' + ic(i) + '</button>').join('') + '</div>' +
      '<div class="sec">Warna</div><div class="sw" id="tcol">' + TCOL.map(c => '<button style="background:' + c + '" data-c="' + c + '" class="' + (t.color === c ? 'on' : '') + '"></button>').join('') + '<label>' + ic('plus') + '<input type="color" value="' + t.color + '"></label></div>' +
      '<div class="sec">Latar teks</div><div class="sw" id="tbg"><button data-c="" title="Tanpa latar" style="background:repeating-conic-gradient(#ddd 0 25%,#fff 0 50%) 0 0/8px 8px" class="' + (!t.bg ? 'on' : '') + '"></button>' + ['rgba(0,0,0,.55)', 'rgba(255,255,255,.85)', '#000000', '#ffffff', '#7c3aed', '#ef4444', '#fde68a'].map(c => '<button style="background:' + c + '" data-c="' + c + '" class="' + (t.bg === c ? 'on' : '') + '"></button>').join('') + '</div>' +
      '<div class="row"><button class="btn sm danger" id="tDel">' + ic('trash') + 'Hapus teks</button></div>';
  } else h += '<p class="hint">Klik teks di halaman untuk mengubahnya. Klik dua kali untuk mengetik langsung, seret untuk memindahkan.</p>';
  h += '<div class="sec">Stiker</div><div class="emoji">' + EMOJI.map(e => '<button data-e="' + e + '">' + e + '</button>').join('') + '</div>';
  p.innerHTML = h;
  const d = dims(P), base = Math.min(d.w, d.h);
  $('#tAdd').onclick = () => addText('Teks Anda');
  $('#tAddT').onclick = () => addText('Kenangan Indah', Math.round(base * .1), { font: 'Great Vibes', bold: false, y: .1 });
  $('#tAddS').onclick = () => addText('Keterangan foto', Math.round(base * .04), { font: 'Inter', bold: false, y: .93, bg: 'rgba(0,0,0,.55)', color: '#ffffff', shadow: false });
  $('#tAddD').onclick = () => addText(new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), Math.round(base * .045), { font: 'Montserrat', y: .95 });
  p.querySelectorAll('[data-e]').forEach(b => b.onclick = () => addText(b.dataset.e, Math.round(base * .09), { font: 'Inter', bold: false, shadow: false, color: '#000000' }));
  if (!t) return;
  const upd = () => { save(); buildPage(sel.pi); placeCtb(); };
  $('#tTxt').oninput = e => { markSoft('tt'); t.txt = e.target.value; upd(); };
  p.querySelectorAll('[data-font]').forEach(b => b.onclick = () => { mark(); t.font = b.dataset.font; upd(); panelText(p); });
  p.querySelectorAll('[data-tg]').forEach(b => b.onclick = () => { mark(); t[b.dataset.tg] = !t[b.dataset.tg]; upd(); panelText(p); });
  p.querySelectorAll('[data-al]').forEach(b => b.onclick = () => { mark(); t.align = b.dataset.al; upd(); panelText(p); });
  p.querySelectorAll('#tcol [data-c]').forEach(b => b.onclick = () => { mark(); t.color = b.dataset.c; upd(); panelText(p); });
  p.querySelector('#tcol input').oninput = e => { markSoft('tc'); t.color = e.target.value; upd(); };
  p.querySelectorAll('#tbg [data-c]').forEach(b => b.onclick = () => { mark(); t.bg = b.dataset.c; upd(); panelText(p); });
  $('#tDel').onclick = () => { mark(); P.pages[sel.pi].texts.splice(sel.ti, 1); const pi = sel.pi; sel = null; save(); buildPage(pi); renderCtb(); panelText(p); };
  bindSliders(p, (k, v) => { t[k] = v; buildPage(sel.pi); placeCtb(); });
}

function panelPaper(p) {
  const d = dims(P), groups = [...new Set(PAPERS.map(x => x.g))];
  p.innerHTML = '<div class="seg"><button data-o="p" class="' + (d.h >= d.w ? 'on' : '') + '">Tegak</button><button data-o="l" class="' + (d.w > d.h ? 'on' : '') + '">Mendatar</button></div>' +
    groups.map(g => '<div class="sec">' + g + '</div><div class="papers">' + PAPERS.filter(x => x.g === g).map(x => {
      const s = 34 / Math.max(x.w, x.h), w = x.w * s, h = x.h * s;
      return '<button data-p="' + x.id + '" class="' + (P.paper.id === x.id ? 'on' : '') + '"><i style="width:' + w + 'px;height:' + h + 'px"></i>' + esc(x.n) + '<small>' + (x.px ? x.px[0] + '×' + x.px[1] : +x.w.toFixed(1) + '×' + +x.h.toFixed(1)) + '</small></button>';
    }).join('') + '</div>').join('') +
    '<div class="sec">Ukuran kustom (mm)</div><div class="row"><input class="inp" id="cw" type="number" min="20" max="2000" value="' + +d.w.toFixed(1) + '" style="width:80px;flex:none">×<input class="inp" id="ch" type="number" min="20" max="2000" value="' + +d.h.toFixed(1) + '" style="width:80px;flex:none"><button class="btn sm" id="cApply">Terapkan</button></div>' +
    '<p class="hint" style="margin-top:12px">Ukuran berlaku untuk semua halaman. Setelah mengganti kertas, tekan <b>Susun otomatis</b> di tab Foto agar foto ditata ulang pas dengan kertas baru.</p>';
  const setPaper = np => {
    mark(); P.paper = np; save(); renderAll(); panelPaper(p);
    if (P.pages.some(pg => pg.tpl === 'auto')) toast('Kertas diganti ke ' + paperLabel(), { label: 'Susun ulang', fn: () => autoAll() }, 5000);
  };
  p.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { const x = paperById(b.dataset.p); const land = x.w > x.h ? false : P.paper.land && x.w !== x.h; setPaper({ id: x.id, w: x.w, h: x.h, px: x.px || null, land }); });
  p.querySelectorAll('[data-o]').forEach(b => b.onclick = () => {
    const want = b.dataset.o === 'l'; if ((d.w > d.h) === want || d.w === d.h) return;
    setPaper(Object.assign({}, P.paper, { land: !P.paper.land }));
  });
  $('#cApply').onclick = () => {
    const w = clamp(+$('#cw').value || 0, 20, 2000), h = clamp(+$('#ch').value || 0, 20, 2000);
    setPaper({ id: 'custom', w, h, px: null, land: false });
  };
}

// ---------- export / print ----------
function exportK(q) {
  const d = dims(P);
  if (d.px) return d.px[0] / d.w * [.5, 1, 2][q - 1];
  return [100, 200, 300][q - 1] / 25.4;
}
async function fullGetter() {
  const full = new Map();
  const fn = async id => {
    if (full.has(id)) return full.get(id);
    const r = recs.get(id) || await get('photos', id); if (!r) return null;
    try { const b = await createImageBitmap(r.blob); full.set(id, b); return b; } catch (e) { return prevs.get(id) || null; }
  };
  fn.free = () => full.forEach(b => b.close && b.close());
  return fn;
}
async function loadFonts() {
  const fs = new Set(); P.pages.forEach(pg => (pg.texts || []).forEach(t => fs.add(t)));
  await Promise.all([...fs].map(t => document.fonts.load(textFont(t, 40)).catch(() => { })));
}
function exportDlg() {
  if (!P) return;
  const d = dims(P), n = P.pages.length, emp = P.pages.reduce((s, pg) => s + pg.cells.filter(c => !c.ph).length, 0);
  const canShare = !!(navigator.canShare && navigator.share && coarse);
  const st = { f: 'pdf', pg: 'all', q: d.px ? 2 : 3 };
  const dlg = modal('<div class="dlg"><h3>Ekspor</h3><p class="hint">' + n + ' halaman · ' + esc(paperLabel()) + '</p>' +
    '<div class="sec">Format</div><div class="seg" data-s="f"><button data-v="pdf">PDF</button><button data-v="jpg">JPG</button><button data-v="png">PNG</button></div>' +
    '<div class="sec">Halaman</div><div class="seg" data-s="pg"><button data-v="all">Semua (' + n + ')</button><button data-v="cur">Halaman ' + (cur + 1) + '</button></div>' +
    '<div class="sec">Kualitas</div><div class="seg" data-s="q"><button data-v="1">Draf</button><button data-v="2">Standar</button><button data-v="3">Tinggi</button></div>' +
    '<p class="hint" id="xInfo"></p>' + (emp ? '<p class="hint" style="color:#f59e0b">' + emp + ' bingkai masih kosong — akan tampil sebagai latar.</p>' : '') +
    '<div class="foot"><button class="btn" data-x="close">Batal</button>' + (canShare ? '<button class="btn" data-x="share">' + ic('share') + 'Bagikan</button>' : '') + '<button class="btn primary" data-x="go">' + ic('download') + 'Unduh</button></div></div>');
  const sync = () => {
    dlg.querySelectorAll('.seg').forEach(s => s.querySelectorAll('button').forEach(b => b.classList.toggle('on', String(st[s.dataset.s]) === b.dataset.v)));
    const k = exportK(st.q), W = Math.round(d.w * k), Hh = Math.round(d.h * k);
    const cnt = st.pg === 'all' ? n : 1;
    $('#xInfo').textContent = W + ' × ' + Hh + ' px' + (d.px ? '' : ' (' + Math.round(k * 25.4) + ' dpi)') + ' · ' + (st.f === 'pdf' ? '1 file PDF' : cnt > 1 ? cnt + ' gambar dalam ZIP' : '1 gambar');
  };
  dlg.querySelectorAll('.seg').forEach(s => s.onclick = e => { const b = e.target.closest('button'); if (!b) return; st[s.dataset.s] = s.dataset.s === 'q' ? +b.dataset.v : b.dataset.v; sync(); });
  dlg.querySelector('.foot').onclick = e => {
    const b = e.target.closest('[data-x]'); if (!b) return;
    if (b.dataset.x === 'close') { modal(); return; }
    modal(); doExport(st, b.dataset.x === 'share');
  };
  sync();
}
async function doExport(st, share) {
  const d = dims(P), k = exportK(st.q), list = st.pg === 'all' ? P.pages.map((_, i) => i) : [cur];
  const getImg = await fullGetter(), name = safeName(P.name);
  let blob, fname;
  try {
    busy('Menyiapkan…'); await loadFonts();
    if (st.f === 'pdf') {
      busy('Memuat pembuat PDF…');
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      const orient = d.w > d.h ? 'l' : 'p';
      const doc = new window.jspdf.jsPDF({ orientation: orient, unit: 'mm', format: [d.w, d.h], compress: true });
      for (let j = 0; j < list.length; j++) {
        busy('Merender halaman ' + (j + 1) + ' dari ' + list.length + '…'); await tick();
        const cv = await renderPage(P, P.pages[list[j]], k, getImg, { opaque: true });
        if (j) doc.addPage([d.w, d.h], orient);
        doc.addImage(cv.toDataURL('image/jpeg', .92), 'JPEG', 0, 0, d.w, d.h, undefined, 'FAST');
        cv.width = cv.height = 0;
      }
      blob = doc.output('blob'); fname = name + '.pdf';
    } else {
      const type = st.f === 'png' ? 'image/png' : 'image/jpeg', ext = st.f, files = [];
      for (let j = 0; j < list.length; j++) {
        busy('Merender halaman ' + (j + 1) + ' dari ' + list.length + '…'); await tick();
        const cv = await renderPage(P, P.pages[list[j]], k, getImg, { opaque: st.f !== 'png' });
        files.push(await new Promise(r => cv.toBlob(r, type, .93)));
        cv.width = cv.height = 0;
      }
      if (files.length === 1) { blob = files[0]; fname = name + (list.length === 1 && P.pages.length > 1 ? '-hal' + (list[0] + 1) : '') + '.' + ext; }
      else {
        busy('Membuat ZIP…');
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
        const z = new window.JSZip();
        files.forEach((b, j) => z.file(name + '-hal' + String(list[j] + 1).padStart(2, '0') + '.' + ext, b));
        blob = await z.generateAsync({ type: 'blob' }); fname = name + '.zip';
      }
    }
    busy(false);
    if (share) {
      const file = new File([blob], fname, { type: blob.type });
      if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: P.name }).catch(() => { }); return; }
    }
    download(blob, fname);
    toast('Tersimpan: ' + fname);
  } catch (e) { console.error(e); busy(false); toast('Ekspor gagal: ' + (e.message || e)); }
  finally { getImg.free(); }
}
async function printAll() {
  if (!P) return;
  const d = dims(P), k = d.px ? exportK(2) : 200 / 25.4, getImg = await fullGetter(), srcs = [];
  try {
    busy('Menyiapkan cetak…'); await loadFonts();
    for (let i = 0; i < P.pages.length; i++) {
      busy('Menyiapkan halaman ' + (i + 1) + ' dari ' + P.pages.length + '…'); await tick();
      const cv = await renderPage(P, P.pages[i], k, getImg, { opaque: true });
      srcs.push(URL.createObjectURL(await new Promise(r => cv.toBlob(r, 'image/jpeg', .92))));
      cv.width = cv.height = 0;
    }
  } finally { getImg.free(); }
  let f = $('#printf');
  if (f) f.remove();
  f = document.createElement('iframe'); f.id = 'printf'; f.setAttribute('aria-hidden', 'true');
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none';
  document.body.append(f);
  const doc = f.contentDocument;
  doc.open();
  doc.write('<!doctype html><html><head><title>' + esc(P.name) + '</title><style>@page{size:' + d.w + 'mm ' + d.h + 'mm;margin:0}html,body{margin:0;padding:0}img{display:block;width:' + d.w + 'mm;height:' + d.h + 'mm;break-after:page;page-break-after:always}img:last-child{break-after:auto;page-break-after:auto}</style></head><body>' + srcs.map(s => '<img src="' + s + '">').join('') + '</body></html>');
  doc.close();
  await Promise.all([...doc.images].map(i => i.decode().catch(() => { })));
  busy(false);
  f.contentWindow.focus(); f.contentWindow.print();
  setTimeout(() => srcs.forEach(s => URL.revokeObjectURL(s)), 60000);
}

// ---------- global events ----------
const editing = e => { const t = e.target; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable); };
document.addEventListener('paste', e => {
  if (editing(e) || !$('#modal').hidden) return;
  const files = [...(e.clipboardData?.files || [])];
  if (!files.length) for (const it of e.clipboardData?.items || []) if (it.kind === 'file' && it.type.startsWith('image/')) { const f = it.getAsFile(); if (f) files.push(f); }
  if (!files.length) return;
  e.preventDefault();
  if (!P) { newAutoFromFiles(files); return; }
  let target = sel && sel.ci != null ? { pi: sel.pi, ci: sel.ci } : null;
  if (!target) { const s = empties()[0]; target = s || (tab === 'photos' ? 'pool' : 'fill'); }
  addFiles(files, target);
});
addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (!$('#modal').hidden) { modal(); return; } if (editing(e)) { e.target.blur(); return; } if (P && sel) select(null); return; }
  if (editing(e) || !P || $('#editor').hidden) return;
  const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
  if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && k === 'y') { e.preventDefault(); redo(); return; }
  if (mod && (k === '=' || k === '+')) { e.preventDefault(); zoomView(1.2); return; }
  if (mod && k === '-') { e.preventDefault(); zoomView(1 / 1.2); return; }
  if (mod && k === '0') { e.preventDefault(); view.zoom = 1; renderAll(); return; }
  if (mod && k === 'p') { e.preventDefault(); printAll(); return; }
  if (mod && k === 's') { e.preventDefault(); saveNow(); toast('Tersimpan otomatis'); return; }
  if ((e.key === 'Delete' || e.key === 'Backspace') && sel) {
    e.preventDefault(); mark();
    if (sel.ti != null) { P.pages[sel.pi].texts.splice(sel.ti, 1); const pi = sel.pi; sel = null; save(); buildPage(pi); renderCtb(); renderPanel(); return; }
    const c = cellOf(sel); if (c) { c.ph = null; c.flt = null; save(); buildPage(sel.pi); renderCtb(); renderPanel(); }
  }
});
// drag & drop of files from the computer
let dragN = 0;
const hasFiles = e => [...(e.dataTransfer?.types || [])].includes('Files');
function dropHint(e) {
  if (!$('#gallery').hidden) return 'Foto akan disusun otomatis di kertas A4';
  if (e.target.closest?.('#side')) return 'Tambahkan ke daftar foto';
  if (e.target.closest?.('.cell')) return 'Masukkan ke bingkai ini (sisanya ke bingkai kosong berikutnya)';
  if (e.target.closest?.('.page')) return 'Isi bingkai kosong di halaman ini';
  return 'Isi bingkai kosong, sisanya ke tab Foto';
}
let lastOver = null;
addEventListener('dragenter', e => { if (!hasFiles(e)) return; dragN++; $('#drop').hidden = false; if (!$('#gallery').hidden) $('#hero').classList.add('over'); });
addEventListener('dragleave', e => { if (!hasFiles(e)) return; if (--dragN <= 0) { dragN = 0; $('#drop').hidden = true; $('#hero').classList.remove('over'); lastOver?.classList.remove('dropt'); } });
addEventListener('dragover', e => {
  if (!hasFiles(e)) return;
  e.preventDefault(); e.dataTransfer.dropEffect = 'copy';
  $('#dropHint').textContent = dropHint(e);
  const c = e.target.closest?.('.cell');
  if (c !== lastOver) { lastOver?.classList.remove('dropt'); c?.classList.add('dropt'); lastOver = c; }
});
addEventListener('drop', e => {
  if (!hasFiles(e)) return;
  e.preventDefault(); dragN = 0; $('#drop').hidden = true; $('#hero').classList.remove('over'); lastOver?.classList.remove('dropt'); lastOver = null;
  const files = [...e.dataTransfer.files];
  if (!$('#gallery').hidden || !P) { newAutoFromFiles(files); return; }
  const c = e.target.closest('.cell'), pw = e.target.closest('.pw');
  let target = 'fill';
  if (e.target.closest('#side')) target = 'pool';
  else if (c) target = { pi: +pw.dataset.i, ci: +c.dataset.c };
  else if (e.target.closest('.page')) target = { pi: +pw.dataset.i };
  addFiles(files, target);
});
let rzT;
addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(() => { if (P) renderAll(); }, 120); });
addEventListener('pagehide', () => { if (P) saveNow(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && P) saveNow(); });

// ---------- boot ----------
$('#gNew').innerHTML = ic('plus') + '<span>Kolase baru</span>';
$('#heroPick').innerHTML = ic('images') + 'Pilih banyak foto';
$('#heroPaste').innerHTML = ic('paste') + 'Tempel';
$('#bBack').innerHTML = ic('back'); $('#bUndo').innerHTML = ic('undo'); $('#bRedo').innerHTML = ic('redo');
$('#bZo').innerHTML = ic('minus'); $('#bZi').innerHTML = ic('plus');
$('#bPrint').innerHTML = ic('print') + 'Cetak'; $('#bExport').innerHTML = ic('download') + 'Ekspor';
$('#sideClose').innerHTML = ic('x');
applyTheme();
showGallery();
window.KOLASE = { get P() { return P; }, recs, prevs, autoArrange, layoutPage, renderPage, openProject, showGallery, addFiles, autoAll, select, get sel() { return sel; } };
