// Kolase — IndexedDB storage (synced per account by /amatu.js) + photo import
const DBN = 'amatu-collage';
let dbp = null;
export function db() {
  return dbp || (dbp = new Promise((res, rej) => {
    const q = indexedDB.open(DBN, 1);
    q.onupgradeneeded = () => {
      const d = q.result;
      if (!d.objectStoreNames.contains('projects')) d.createObjectStore('projects', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('photos')) d.createObjectStore('photos', { keyPath: 'id' });
    };
    q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error);
  }));
}
const tx = async (st, mode, fn) => {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction(st, mode), s = t.objectStore(st), r = fn(s);
    t.oncomplete = () => res(r && 'result' in r ? r.result : undefined); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
  });
};
export const getAll = st => tx(st, 'readonly', s => s.getAll());
export const get = (st, id) => tx(st, 'readonly', s => s.get(id));
export const put = (st, v) => tx(st, 'readwrite', s => s.put(v));
export const del = (st, id) => tx(st, 'readwrite', s => s.delete(id));

const MAX = 2800, PREV = 1200;
const toBlob = (cv, q) => new Promise(r => cv.toBlob(r, 'image/jpeg', q));
async function decode(file) {
  try { return await createImageBitmap(file); } catch (e) {
    const u = URL.createObjectURL(file);
    try { const im = new Image(); im.src = u; await im.decode(); return im; } finally { setTimeout(() => URL.revokeObjectURL(u), 3000); }
  }
}
function scaled(src, max) {
  const W = src.width, H = src.height, s = Math.min(1, max / Math.max(W, H));
  const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(W * s)); cv.height = Math.max(1, Math.round(H * s));
  const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); x.imageSmoothingQuality = 'high';
  x.drawImage(src, 0, 0, cv.width, cv.height);
  return cv;
}
// file → stored photo record {id, blob, prev, w, h, name}
export async function importFile(file, id) {
  const src = await decode(file);
  const big = scaled(src, MAX), small = scaled(big, PREV);
  if (src.close) src.close();
  const rec = { id, name: file.name || 'foto', w: big.width, h: big.height, blob: await toBlob(big, .9), prev: await toBlob(small, .85), t: Date.now() };
  await put('photos', rec);
  big.width = big.height = 0;
  return { rec, prevCanvas: small };
}
