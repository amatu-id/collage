// Kolase — data model: paper sizes, layout templates, cell shapes, defaults.
export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- paper sizes (mm; digital sizes also carry an export pixel size) ----------
export const PAPERS = [
  { id: 'a4', n: 'A4', w: 210, h: 297, g: 'Kertas' },
  { id: 'f4', n: 'F4 / Folio', w: 215, h: 330, g: 'Kertas' },
  { id: 'a5', n: 'A5', w: 148, h: 210, g: 'Kertas' },
  { id: 'a3', n: 'A3', w: 297, h: 420, g: 'Kertas' },
  { id: 'letter', n: 'Letter', w: 215.9, h: 279.4, g: 'Kertas' },
  { id: 'legal', n: 'Legal', w: 215.9, h: 355.6, g: 'Kertas' },
  { id: '3r', n: '3R', w: 89, h: 127, g: 'Kertas foto' },
  { id: '4r', n: '4R', w: 102, h: 152, g: 'Kertas foto' },
  { id: '5r', n: '5R', w: 127, h: 178, g: 'Kertas foto' },
  { id: '8r', n: '8R', w: 203, h: 254, g: 'Kertas foto' },
  { id: '10r', n: '10R', w: 254, h: 305, g: 'Kertas foto' },
  { id: 'sq', n: 'Persegi 1:1', w: 200, h: 200, px: [2160, 2160], g: 'Digital' },
  { id: 'ig', n: 'Instagram 4:5', w: 200, h: 250, px: [1080, 1350], g: 'Digital' },
  { id: 'story', n: 'Story 9:16', w: 180, h: 320, px: [1080, 1920], g: 'Digital' },
  { id: 'wide', n: 'Lanskap 16:9', w: 320, h: 180, px: [1920, 1080], g: 'Digital' },
  { id: 'fbc', n: 'Sampul Facebook', w: 300, h: 113.4, px: [1640, 624], g: 'Digital' }
];
export const paperById = id => PAPERS.find(p => p.id === id);
// effective page size of a project (orientation applied)
export function dims(P) {
  const p = P.paper;
  return p.land ? { w: p.h, h: p.w, px: p.px && [p.px[1], p.px[0]] } : { w: p.w, h: p.h, px: p.px };
}

// ---------- templates: slicing-tree strings ----------
// x = photo, h(..) = side by side, v(..) = stacked, a number prefix = relative size
function parse(s) {
  let i = 0;
  const node = () => {
    const m = /^[0-9.]+/.exec(s.slice(i)); let w = 1;
    if (m) { w = parseFloat(m[0]); i += m[0].length; }
    const c = s[i++];
    if (c === 'x') return { w };
    i++;
    const kids = [node()];
    while (s[i] === ',') { i++; kids.push(node()); }
    i++;
    return { w, t: c, kids };
  };
  return node();
}
function rectsOf(n, x, y, w, h, out = []) {
  if (!n.t) { out.push({ x, y, w, h }); return out; }
  const tot = n.kids.reduce((a, k) => a + k.w, 0);
  let o = 0;
  for (const k of n.kids) {
    const f = k.w / tot;
    if (n.t === 'h') rectsOf(k, x + o * w, y, f * w, h, out); else rectsOf(k, x, y + o * h, w, f * h, out);
    o += f;
  }
  return out;
}
const TREES = [
  'x',
  'h(x,x)', 'v(x,x)', 'h(2x,x)', 'h(x,2x)', 'v(2x,x)', 'v(x,2x)',
  'h(x,x,x)', 'v(x,x,x)', 'h(x,v(x,x))', 'h(v(x,x),x)', 'v(x,h(x,x))', 'v(h(x,x),x)', 'h(2x,v(x,x))', 'v(2x,h(x,x))', 'h(x,2x,x)', 'v(x,2x,x)',
  'h(x,x,x,x)', 'v(x,x,x,x)', 'h(2x,v(x,x,x))', 'h(v(x,x,x),2x)', 'v(2x,h(x,x,x))', 'v(h(x,x,x),2x)', 'v(h(2x,x),h(x,2x))', 'h(v(2x,x),v(x,2x))',
  'v(x,h(x,x),x)', 'h(x,v(x,x),x)', 'h(v(x,x),2x,x)', 'v(h(x,x),2x,x)',
  'v(h(x,x),h(x,x,x))', 'v(h(x,x,x),h(x,x))', 'h(v(x,x),v(x,x,x))', 'h(v(x,x),x,v(x,x))', 'v(h(x,x),x,h(x,x))', 'v(2x,h(x,x,x,x))', 'h(2x,v(x,x,x,x))',
  'v(2h(x,x),h(x,x,x))', 'h(2x,v(h(x,x),h(x,x)))', 'h(v(h(x,x),h(x,x)),2x)', 'v(h(2x,v(x,x)),h(x,x))', 'h(v(x,2x),v(x,x,x))',
  'v(h(x,x,x),h(x,x,x))', 'h(v(x,x,x),v(x,x,x))', 'v(h(x,x),h(x,x),h(x,x))', 'v(2h(2x,v(x,x)),h(x,x,x))', 'h(2v(2x,h(x,x)),v(x,x,x))',
  'v(h(x,x,x),2x,h(x,x))', 'h(v(x,x,x),2x,v(x,x))', 'v(2x,h(x,x,x),h(x,x))', 'v(h(v(x,x),2x),h(x,x,x))',
  'v(h(x,x,x),h(x,x),h(x,x))', 'v(h(x,x),h(x,x,x),h(x,x))', 'h(v(x,x,x),2x,v(x,x,x))', 'v(2h(2x,v(x,x)),h(x,x,x,x))', 'v(h(x,x,x,x),h(x,x,x))', 'h(2v(2x,h(x,x,x)),v(x,x,x))',
  'v(h(x,x,x),h(x,x),h(x,x,x))', 'v(h(x,x,x),2h(v(x,x),2x),h(x,x))', 'v(2h(2x,v(x,x)),h(x,x,x),h(x,x))',
  'v(2h(2x,v(x,x,x)),h(x,x,x),h(x,x))', 'v(h(x,x,x,x),h(x,x),h(x,x,x))',
  'v(h(x,x,x),2h(v(x,x),2x,v(x,x)),h(x,x))', 'v(h(x,x,x,x),h(x,x,x),h(x,x,x))',
  'v(h(x,x,x),2h(v(x,x),2x,v(x,x)),h(x,x,x))',
  'v(h(x,x,x,x),2h(v(x,x),2x,v(x,x)),h(x,x,x))',
  'v(h(x,x,x,x),2h(v(x,x),2x,v(x,x)),h(x,x,x,x))'
];
// non-guillotine classics
const EXPLICIT = {
  pinwheel: [[0, 0, 2 / 3, 1 / 3], [2 / 3, 0, 1 / 3, 2 / 3], [1 / 3, 2 / 3, 2 / 3, 1 / 3], [0, 1 / 3, 1 / 3, 2 / 3], [1 / 3, 1 / 3, 1 / 3, 1 / 3]],
  pinwheel4: [[0, 0, .62, .38], [.62, 0, .38, .62], [.38, .62, .62, .38], [0, .38, .38, .62]],
  stairs: [[0, 0, .5, .34], [.5, 0, .5, .5], [0, .34, .5, .33], [.5, .5, .5, .5], [0, .67, .5, .33]]
};
export const TEMPLATES = (() => {
  const list = [], seen = new Set();
  const add = (id, rects) => {
    const sig = rects.map(r => [r.x, r.y, r.w, r.h].map(v => v.toFixed(3)).join(',')).sort().join(';');
    if (seen.has(sig)) return;
    seen.add(sig); list.push({ id, n: rects.length, rects });
  };
  for (const s of TREES) add('t:' + s, rectsOf(parse(s), 0, 0, 1, 1));
  for (const [k, a] of Object.entries(EXPLICIT)) add('e:' + k, a.map(([x, y, w, h]) => ({ x, y, w, h })));
  for (let r = 1; r <= 6; r++) for (let c = 1; c <= 6; c++) {
    const out = [];
    for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) out.push({ x: j / c, y: i / r, w: 1 / c, h: 1 / r });
    add('g:' + r + 'x' + c, out);
  }
  list.sort((a, b) => a.n - b.n);
  return list;
})();
export const tplById = id => TEMPLATES.find(t => t.id === id);

// ---------- shapes ----------
export const SHAPES = [
  ['rect', 'Kotak'], ['oval', 'Oval'], ['circle', 'Lingkaran'], ['arch', 'Lengkung'],
  ['heart', 'Hati'], ['hex', 'Heksagon'], ['diamond', 'Berlian'], ['star', 'Bintang']
];
export function shapePath(ctx, shape, w, h, r = 0) {
  ctx.beginPath();
  if (shape === 'oval') { ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); return; }
  if (shape === 'circle') { ctx.arc(w / 2, h / 2, Math.min(w, h) / 2, 0, Math.PI * 2); return; }
  if (shape === 'arch') {
    const R = Math.min(w / 2, h);
    ctx.moveTo(0, h); ctx.lineTo(0, R); ctx.ellipse(w / 2, R, w / 2, R, 0, Math.PI, 0); ctx.lineTo(w, h); ctx.closePath(); return;
  }
  if (shape === 'heart') {
    const s = Math.min(w, h), ox = (w - s) / 2, oy = (h - s) / 2, P = (x, y) => [ox + x * s, oy + y * s];
    ctx.moveTo(...P(.5, .95));
    ctx.bezierCurveTo(...P(.08, .66), ...P(-.04, .38), ...P(.12, .18));
    ctx.bezierCurveTo(...P(.26, .02), ...P(.46, .06), ...P(.5, .24));
    ctx.bezierCurveTo(...P(.54, .06), ...P(.74, .02), ...P(.88, .18));
    ctx.bezierCurveTo(...P(1.04, .38), ...P(.92, .66), ...P(.5, .95));
    ctx.closePath(); return;
  }
  if (shape === 'hex') { [[.25, 0], [.75, 0], [1, .5], [.75, 1], [.25, 1], [0, .5]].forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](x * w, y * h)); ctx.closePath(); return; }
  if (shape === 'diamond') { [[.5, 0], [1, .5], [.5, 1], [0, .5]].forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](x * w, y * h)); ctx.closePath(); return; }
  if (shape === 'star') {
    const cx = w / 2, cy = h / 2 + h * .04, R = Math.min(w, h) * .52, ri = R * .48;
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i & 1 ? ri : R;
      ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr * (w / Math.min(w, h)), cy + Math.sin(a) * rr * (h / Math.min(w, h)));
    }
    ctx.closePath(); return;
  }
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  if (!r) { ctx.rect(0, 0, w, h); return; }
  ctx.moveTo(r, 0); ctx.arcTo(w, 0, w, h, r); ctx.arcTo(w, h, 0, h, r); ctx.arcTo(0, h, 0, 0, r); ctx.arcTo(0, 0, w, 0, r); ctx.closePath();
}

// ---------- backgrounds ----------
export const BGS = [
  { t: 'solid', c: '#ffffff' }, { t: 'solid', c: '#000000' }, { t: 'solid', c: '#f5efe6' }, { t: 'solid', c: '#e5e7eb' }, { t: 'solid', c: '#4b5563' },
  { t: 'solid', c: '#1f2937' }, { t: 'solid', c: '#fde2e4' }, { t: 'solid', c: '#e2ece9' }, { t: 'solid', c: '#dbeafe' }, { t: 'solid', c: '#fef3c7' },
  { t: 'solid', c: '#7f1d1d' }, { t: 'solid', c: '#14532d' }, { t: 'solid', c: '#1e3a8a' }, { t: 'solid', c: '#c2410c' },
  { t: 'grad', a: '#ffecd2', b: '#fcb69f', ang: 135 }, { t: 'grad', a: '#a1c4fd', b: '#c2e9fb', ang: 135 }, { t: 'grad', a: '#fbc2eb', b: '#a6c1ee', ang: 135 },
  { t: 'grad', a: '#d4fc79', b: '#96e6a1', ang: 135 }, { t: 'grad', a: '#f6d365', b: '#fda085', ang: 160 }, { t: 'grad', a: '#232526', b: '#414345', ang: 160 },
  { t: 'grad', a: '#0f2027', b: '#2c5364', ang: 160 }, { t: 'grad', a: '#ee9ca7', b: '#ffdde1', ang: 180 }, { t: 'none' }
];
export const bgCss = b => !b || b.t === 'none'
  ? 'repeating-conic-gradient(#e7e7ea 0 25%, #fff 0 50%) 0 0/16px 16px'
  : b.t === 'grad' ? `linear-gradient(${b.ang}deg, ${b.a}, ${b.b})` : b.c;

export const FONTS = ['Inter', 'Montserrat', 'Playfair Display', 'Merriweather', 'Oswald', 'Bebas Neue', 'Pacifico', 'Dancing Script', 'Great Vibes', 'Caveat', 'Lobster', 'Permanent Marker'];
export const EMOJI = '❤️ 💕 ✨ ⭐ 🌟 🎉 🎈 🎂 🎁 🌸 🌺 🌻 🌷 🍀 🌈 ☀️ 🌙 ☁️ 🦋 🐾 📸 🎓 💍 👑 🏖️ ✈️ 🏡 🎄 🕌 🥳 😊 😍 🥰 😎 👍 🙏 💯 🔥 📍 🇮🇩'.split(' ');

export function newCell(r, ph = null) {
  return { id: uid(), x: r.x, y: r.y, w: r.w, h: r.h, ph, fx: .5, fy: .5, z: 1, rot: 0, ang: 0, flip: false, flt: null };
}
export function newPage(tplId = 'g:2x2') {
  const t = tplById(tplId) || tplById('g:2x2');
  return { id: uid(), tpl: t.id, cells: t.rects.map(r => newCell(r)), texts: [] };
}
export function newProject(o = {}) {
  const pp = paperById(o.paper || 'a4');
  return {
    id: uid(), name: o.name || 'Kolase tanpa judul', created: Date.now(), updated: Date.now(),
    paper: { id: pp.id, w: pp.w, h: pp.h, px: pp.px || null, land: !!o.land },
    style: Object.assign({ gap: 3, margin: 3, radius: 0, shape: 'rect', border: 0, borderColor: '#ffffff', shadow: 0, bg: { t: 'solid', c: '#ffffff' } }, o.style || {}),
    auto: Object.assign({ per: 'auto', mode: 'auto', smart: true, rotate: false, seed: 1 }, o.auto || {}),
    pages: o.pages || [newPage(o.tpl || 'g:2x2')], pool: [], thumb: ''
  };
}
