import { bboxOf, toPolygons, volumeMm3, type Geom3 } from "./geometry";
import type { ColorPart } from "./types";

function writeBinaryStl(geom: Geom3, name: string): ArrayBuffer {
  const polys = toPolygons(geom);
  let tri = 0;
  for (const p of polys) tri += Math.max(0, p.vertices.length - 2);
  const buf = new ArrayBuffer(84 + tri * 50);
  const view = new DataView(buf);
  const title = new TextEncoder().encode(("PrintForge " + name).slice(0, 80));
  for (let i = 0; i < title.length; i++) view.setUint8(i, title[i]!);
  view.setUint32(80, tri, true);
  let o = 84;
  for (const poly of polys) {
    const v = poly.vertices;
    for (let i = 1; i < v.length - 2 + 1; i++) {
      const a = v[0]!;
      const b = v[i]!;
      const c = v[i + 1]!;
      const nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]);
      const ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
      const nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      const len = Math.hypot(nx, ny, nz) || 1;
      view.setFloat32(o, nx / len, true);
      o += 4;
      view.setFloat32(o, ny / len, true);
      o += 4;
      view.setFloat32(o, nz / len, true);
      o += 4;
      for (const pt of [a, b, c]) {
        view.setFloat32(o, pt[0]!, true);
        o += 4;
        view.setFloat32(o, pt[1]!, true);
        o += 4;
        view.setFloat32(o, pt[2]!, true);
        o += 4;
      }
      view.setUint16(o, 0, true);
      o += 2;
    }
  }
  return buf;
}

function triggerDownload(buf: ArrayBuffer, filename: string, mime: string) {
  const blob = new Blob([buf], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadStl(geom: Geom3, filename: string) {
  const name = filename.endsWith(".stl") ? filename : `${filename}.stl`;
  const buf = writeBinaryStl(geom, name);
  triggerDownload(buf, name, "model/stl");
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(data: Uint8Array) {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zipStore(files: { name: string; data: ArrayBuffer }[]): ArrayBuffer {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const data = new Uint8Array(file.data);
    const crc = crc32(data);
    const local = new Uint8Array(30 + nameBytes.length + data.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(14, crc & 0xffff, true);
    lv.setUint16(16, (crc >>> 16) & 0xffff, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    local.set(data, 30 + nameBytes.length);
    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }
  const centralStart = offset;
  let centralSize = 0;
  for (const c of centrals) centralSize += c.length;
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, centralStart, true);
  const out = new Uint8Array(offset + centralSize + 22);
  let p = 0;
  for (const l of locals) {
    out.set(l, p);
    p += l.length;
  }
  for (const c of centrals) {
    out.set(c, p);
    p += c.length;
  }
  out.set(end, p);
  return out.buffer;
}

export function downloadColorPack(parts: ColorPart[], basename: string) {
  if (parts.length <= 1) {
    downloadStl(parts[0]!.geom, `${basename}.stl`);
    return;
  }
  const files = parts.map((p) => ({
    name: `${basename}_${p.name}.stl`,
    data: writeBinaryStl(p.geom, `${basename}_${p.name}`),
  }));
  const zip = zipStore(files);
  triggerDownload(zip, `${basename}_AMS.zip`, "application/zip");
}

export function meshStats(geom: Geom3) {
  const { size } = bboxOf(geom);
  const volume = volumeMm3(geom);
  const gramsPla = (volume / 1000) * 1.24;
  const minutes = volume / 15 / 60;
  return { size, volume, gramsPla, minutes };
}

export function stlName(id: string, size: [number, number, number]) {
  const [w, d, h] = size.map((n) => Math.round(n));
  return `PrintForge_${id}_${w}x${d}x${h}mm`;
}
