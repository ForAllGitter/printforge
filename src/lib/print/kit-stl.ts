import { BufferGeometry, Vector3 } from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { KIT_STL } from "./handpress";
import { downloadBuffer } from "./stl";
import { num, str, type Values } from "./types";

const loader = new STLLoader();

export function kitFilesFor(part: string) {
  return KIT_STL[part] ?? null;
}

export function scaleBinaryStl(buf: ArrayBuffer, scale: number): ArrayBuffer {
  if (Math.abs(scale - 1) < 0.001) return buf.slice(0);
  const copy = buf.slice(0);
  const view = new DataView(copy);
  const tri = view.getUint32(80, true);
  let o = 84;
  for (let i = 0; i < tri; i++) {
    o += 12;
    for (let k = 0; k < 9; k++) {
      view.setFloat32(o, view.getFloat32(o, true) * scale, true);
      o += 4;
    }
    o += 2;
  }
  return copy;
}

export async function loadKitPreview(url: string, scale: number): Promise<{
  geometry: BufferGeometry;
  size: [number, number, number];
}> {
  const buf = await fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Could not load ${url}`);
    return r.arrayBuffer();
  });
  const geometry = loader.parse(buf);
  geometry.rotateX(-Math.PI / 2);
  if (Math.abs(scale - 1) > 0.001) geometry.scale(scale, scale, scale);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const bb = geometry.boundingBox!;
  const size = bb.getSize(new Vector3());
  return { geometry, size: [size.x, size.z, size.y] };
}

export async function downloadKitPart(url: string, filename: string, scale: number) {
  const buf = await fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Could not load ${url}`);
    return r.arrayBuffer();
  });
  downloadBuffer(scaleBinaryStl(buf, scale), filename.endsWith(".stl") ? filename : `${filename}.stl`);
}

export function kitScaleOf(values: Values) {
  return Math.min(1.4, Math.max(0.8, num(values, "scale", 114) / 100));
}

export function kitPartOf(values: Values) {
  return str(values, "part", "handle");
}
