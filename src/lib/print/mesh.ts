import { BufferAttribute, BufferGeometry } from "three";
import { toPolygons, type Geom3 } from "./geometry";

/** JSCAD is Z-up. Three.js is Y-up: (x, y, z) → (x, z, -y). */
export function geomToThree(geom: Geom3): BufferGeometry {
  const polys = toPolygons(geom);
  const positions: number[] = [];
  for (const poly of polys) {
    const v = poly.vertices;
    for (let i = 1; i < v.length - 1; i++) {
      const a = v[0]!;
      const b = v[i]!;
      const c = v[i + 1]!;
      positions.push(a[0]!, a[2]!, -a[1]!, b[0]!, b[2]!, -b[1]!, c[0]!, c[2]!, -c[1]!);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
