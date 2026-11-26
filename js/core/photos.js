// Fotos: verkleinert auf dem Gerät gespeichert, Aufnahmezeit aus der Bilddatei gelesen.

import * as db from './db.js';
import { emit } from './bus.js';
import { newId } from './util.js';

/** Aufnahmezeit aus einem JPEG ("YYYY-MM-DDTHH:mm") oder null. */
export async function readTakenAt(file) {
  try {
    const view = new DataView(await file.slice(0, 262144).arrayBuffer());
    if (view.byteLength < 12 || view.getUint16(0) !== 0xFFD8) return null;
    let off = 2;
    while (off + 10 < view.byteLength) {
      const marker = view.getUint16(off), size = view.getUint16(off + 2);
      if ((marker & 0xFF00) !== 0xFF00) return null;
      if (marker === 0xFFE1 && view.getUint32(off + 4) === 0x45786966) {
        const tiff = off + 10, le = view.getUint16(tiff) === 0x4949;
        const u16 = o => view.getUint16(o, le), u32 = o => view.getUint32(o, le);
        const find = (ifd, tag) => {
          const n = u16(ifd);
          for (let i = 0; i < n; i++) { const e = ifd + 2 + i * 12; if (u16(e) === tag) return e; }
          return 0;
        };
        const str = e => {
          const count = u32(e + 4), o = count > 4 ? tiff + u32(e + 8) : e + 8;
          let s = '';
          for (let i = 0; i < count - 1 && i < 24; i++) s += String.fromCharCode(view.getUint8(o + i));
          return s;
        };
        const ifd0 = tiff + u32(tiff + 4), exif = find(ifd0, 0x8769);
        let txt = null, e;
        if (exif) { const sub = tiff + u32(exif + 8); e = find(sub, 0x9003) || find(sub, 0x9004); if (e) txt = str(e); }
        if (!txt) { e = find(ifd0, 0x0132); if (e) txt = str(e); }
        const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2})/.exec(txt || '');
        return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}` : null;
      }
      off += 2 + size;
    }
  } catch (err) { /* unlesbare Datei: keine Aufnahmezeit */ }
  return null;
}

async function scaled(file, maxPx, quality) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const f = Math.min(1, maxPx / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * f);
  canvas.height = Math.round(bmp.height * f);
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) throw new Error('Das Bild ließ sich nicht verkleinern.');
  return { blob, w: canvas.width, h: canvas.height };
}

/** Speichert ein Foto zu einem Eintrag (max. 1600 px plus Vorschaubild 320 px). */
export async function savePhoto(entryId, file) {
  let big, small;
  try {
    big = await scaled(file, 1600, 0.82);
    small = await scaled(file, 320, 0.7);
  } catch (err) {
    throw new Error('Dieses Bildformat kann das Gerät hier nicht lesen. Bitte ein JPEG oder PNG wählen.');
  }
  const now = Date.now();
  const photo = { id: newId('p'), entryId, blob: big.blob, thumb: small.blob, w: big.w, h: big.h,
    takenAt: await readTakenAt(file), createdAt: now, updatedAt: now, deletedAt: null };
  await db.put('photos', photo);
  emit('data', { store: 'photos', id: photo.id });
  return photo;
}

export const photosOf = async entryId => (await db.getAllByIndex('photos', 'entryId', entryId)).filter(p => !p.deletedAt);

/** Löscht ein Foto: Bilddaten weg, Löschmarke bleibt. */
export async function removePhoto(id) {
  const p = await db.get('photos', id);
  if (!p) return false;
  const now = Date.now();
  await db.put('photos', Object.assign({}, p, { blob: null, thumb: null, deletedAt: now, updatedAt: now }));
  emit('data', { store: 'photos', id });
  return true;
}
