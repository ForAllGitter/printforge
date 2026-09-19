import { writeFileSync } from "node:fs";
import modeling from "@jscad/modeling/src/index.js";

const {
  primitives,
  booleans,
  transforms,
  extrusions,
  expansions,
  measurements,
  geometries,
  text,
} = modeling.default ?? modeling;

const { cuboid, cylinder, line } = primitives;
const { union, subtract } = booleans;
const { translate, scale } = transforms;
const { extrudeLinear } = extrusions;
const { expand } = expansions;
const { measureBoundingBox } = measurements;
const { vectorText } = text;

function raisedText(raw, height, stroke, thickness) {
  const strokes = vectorText({
    height: Math.max(4, height),
    align: "center",
    letterSpacing: 0.6,
    input: raw,
  });
  const letters = [];
  for (const strokePts of strokes) {
    if (!strokePts || strokePts.length < 2) continue;
    try {
      const trace = expand({ delta: stroke, corners: "round", segments: 8 }, line(strokePts));
      letters.push(extrudeLinear({ height: thickness }, trace));
    } catch {
      // skip
    }
  }
  if (!letters.length) return null;
  return letters.length === 1 ? letters[0] : union(letters);
}

function toStl(geom, path) {
  const polys = geometries.geom3.toPolygons(geom);
  let tri = 0;
  for (const p of polys) tri += Math.max(0, p.vertices.length - 2);
  const buf = Buffer.alloc(84 + tri * 50);
  buf.write("PrintForge D3DD");
  buf.writeUInt32LE(tri, 80);
  let o = 84;
  for (const poly of polys) {
    const v = poly.vertices;
    for (let i = 1; i < v.length - 1; i++) {
      const a = v[0], b = v[i], c = v[i + 1];
      const nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]);
      const ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
      const nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      const len = Math.hypot(nx, ny, nz) || 1;
      buf.writeFloatLE(nx / len, o); o += 4;
      buf.writeFloatLE(ny / len, o); o += 4;
      buf.writeFloatLE(nz / len, o); o += 4;
      for (const pt of [a, b, c]) {
        buf.writeFloatLE(pt[0], o); o += 4;
        buf.writeFloatLE(pt[1], o); o += 4;
        buf.writeFloatLE(pt[2], o); o += 4;
      }
      buf.writeUInt16LE(0, o); o += 2;
    }
  }
  writeFileSync(path, buf);
  const bb = measureBoundingBox(geom);
  console.log(path, "tris", tri, "bbox", bb);
}

const handleMark = raisedText("D3DD", 8.5, 0.95, 1.6);
const sleeveMark = raisedText("D3DD", 6.5, 0.8, 1.4);
toStl(handleMark, "/tmp/d3dd_handle.stl");
toStl(sleeveMark, "/tmp/d3dd_sleeve.stl");
